import java.net.ServerSocket;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import sivaku.harness.Check;
import sivaku.harness.NoReply;

/**
 * Hidden tests for PointsHandler, through a server like PointsServer that
 * also records how each handler ended (HiddenServer): each command and the
 * error replies (2 points each), then several clients at once, hanging up,
 * the wrong number of words, and exactly one reply per command (1 point each).
 */
public class Harness {
    private static final int WAIT = 2000;

    /** What a command needs a reply to, as tests.json "needs" names it: the command, or "other" for an ERROR. */
    private static String need(String command) {
        if (command.matches("ADD -?\\d+")) {
            return "ADD";
        }
        return switch (command) {
            case "SHOW", "RESET", "BYE" -> command;
            default -> "other";
        };
    }

    /** Sends a command and returns the reply; no reply within WAIT ends the case (NoReply). */
    private static String ask(TestClient client, String command) throws Exception {
        String reply = client.send(command);
        if (reply.equals("(no reply)")) {
            String shown = command.isEmpty() ? "an empty line" : command;
            throw new NoReply(need(command), "no reply to " + shown + " within " + WAIT / 1000 + " seconds");
        }
        return reply;
    }

    /** Sends each command on one new connection and returns the replies. */
    private static String conversation(String... commands) throws Exception {
        HiddenServer server = new HiddenServer();
        List<String> replies = new ArrayList<>();
        try (TestClient client = new TestClient(server.port(), WAIT)) {
            for (String command : commands) {
                String reply = ask(client, command);
                replies.add(reply);
                if (reply.startsWith("(")) {
                    // The connection closed: the rest would get nothing.
                    break;
                }
            }
        }
        server.close();
        return String.join(" | ", replies);
    }

    public static void sampleFromTheHandout() throws Exception {
        ServerSocket listener = new ServerSocket(0);
        Thread server = new Thread(new PointsServer(listener));
        server.setDaemon(true);
        server.start();
        List<String> replies = new ArrayList<>();
        try (TestClient client = new TestClient(listener.getLocalPort(), WAIT)) {
            for (String command : new String[] {"ADD 5", "ADD 3", "SHOW", "RESET", "JUMP", "BYE"}) {
                String reply = ask(client, command);
                replies.add(reply);
                if (reply.startsWith("(")) {
                    break;
                }
            }
        }
        listener.close();
        Check.equal("replies to ADD 5, ADD 3, SHOW, RESET, JUMP, BYE",
                "POINTS 5 | POINTS 8 | POINTS 8 | POINTS 0 | ERROR | BYE", String.join(" | ", replies));
    }

    public static void addKeepsARunningTotal() throws Exception {
        Check.equal("replies to ADD 5, ADD 7, ADD -4, ADD 0", "POINTS 5 | POINTS 12 | POINTS 8 | POINTS 8",
                conversation("ADD 5", "ADD 7", "ADD -4", "ADD 0"));
    }

    public static void showAtTheStartAndLater() throws Exception {
        Check.equal("replies to SHOW, ADD 9, SHOW, SHOW", "POINTS 0 | POINTS 9 | POINTS 9 | POINTS 9",
                conversation("SHOW", "ADD 9", "SHOW", "SHOW"));
    }

    public static void resetStartsAgain() throws Exception {
        Check.equal("replies to ADD 6, RESET, SHOW, ADD 2", "POINTS 6 | POINTS 0 | POINTS 0 | POINTS 2",
                conversation("ADD 6", "RESET", "SHOW", "ADD 2"));
    }

    public static void byeClosesAndReturns() throws Exception {
        HiddenServer server = new HiddenServer();
        try (TestClient client = new TestClient(server.port(), WAIT)) {
            Check.equal("reply to ADD 1", "POINTS 1", ask(client, "ADD 1"));
            Check.equal("reply to BYE", "BYE", ask(client, "BYE"));
            Check.equal("the connection after BYE", "(closed)", client.read());
        }
        Check.equal("how handle ended", "[returned]", server.endings(1, WAIT).toString());
        server.close();
    }

    public static void unknownCommands() throws Exception {
        Check.equal("replies to HELLO, show, Add 3, SHOW", "ERROR | ERROR | ERROR | POINTS 0",
                conversation("HELLO", "show", "Add 3", "SHOW"));
    }

    public static void addWithoutAWholeNumber() throws Exception {
        Check.equal("replies to ADD five, ADD 2.5, ADD 3, SHOW", "ERROR | ERROR | POINTS 3 | POINTS 3",
                conversation("ADD five", "ADD 2.5", "ADD 3", "SHOW"));
    }

    public static void emptyLine() throws Exception {
        Check.equal("replies to an empty line, ADD 4, an empty line, SHOW", "ERROR | POINTS 4 | ERROR | POINTS 4",
                conversation("", "ADD 4", "", "SHOW"));
    }

    public static void severalClientsAtOnce() throws Exception {
        HiddenServer server = new HiddenServer();
        int clients = 6;
        CountDownLatch connected = new CountDownLatch(clients);
        String[] totals = new String[clients];
        NoReply[] silence = new NoReply[1];
        List<Thread> threads = new ArrayList<>();
        for (int c = 0; c < clients; c++) {
            int me = c;
            threads.add(new Thread(() -> {
                try (TestClient client = new TestClient(server.port(), WAIT)) {
                    connected.countDown();
                    connected.await(WAIT, TimeUnit.MILLISECONDS);
                    String reply = "";
                    for (int k = 0; k < 3 && !reply.startsWith("("); k++) {
                        reply = ask(client, "ADD " + (me + 1));
                    }
                    totals[me] = reply.startsWith("(") ? reply : ask(client, "SHOW");
                    ask(client, "BYE");
                } catch (NoReply e) {
                    totals[me] = e.getMessage();
                    silence[0] = e;
                } catch (Exception e) {
                    totals[me] = "failed: " + e;
                }
            }));
        }
        for (Thread t : threads) {
            t.start();
        }
        for (Thread t : threads) {
            t.join(3 * WAIT);
        }
        server.close();
        if (silence[0] != null) {
            throw silence[0];
        }
        List<String> expected = new ArrayList<>();
        for (int c = 0; c < clients; c++) {
            expected.add("POINTS " + 3 * (c + 1));
        }
        Check.equal("each client's SHOW after adding its own number three times, all connected at once",
                expected.toString(), List.of(totals).toString());
    }

    public static void hangUpWithoutBye() throws Exception {
        HiddenServer server = new HiddenServer();
        try (TestClient client = new TestClient(server.port(), WAIT)) {
            Check.equal("reply to ADD 1", "POINTS 1", ask(client, "ADD 1"));
        }
        Check.equal("how handle ended after the client hung up", "[returned]", server.endings(1, WAIT).toString());
        server.close();
    }

    public static void wrongNumberOfWords() throws Exception {
        Check.equal("replies to ADD, ADD 1 2, SHOW 1, RESET now, BYE now, SHOW",
                "ERROR | ERROR | ERROR | ERROR | ERROR | POINTS 0",
                conversation("ADD", "ADD 1 2", "SHOW 1", "RESET now", "BYE now", "SHOW"));
    }

    public static void oneReplyPerCommandAndAFreshStart() throws Exception {
        HiddenServer server = new HiddenServer();
        try (TestClient first = new TestClient(server.port(), WAIT)) {
            for (String command : new String[] {"ADD 4", "SHOW", "RESET", "ADD x", "ADD 4"}) {
                Check.isTrue("a reply to " + command, !ask(first, command).startsWith("("));
                Check.isTrue("only one reply to " + command, !first.extraLine(40));
            }
            ask(first, "BYE");
        }
        try (TestClient second = new TestClient(server.port(), WAIT)) {
            Check.equal("a new client's SHOW after another client added 4", "POINTS 0", ask(second, "SHOW"));
        }
        server.close();
    }
}
