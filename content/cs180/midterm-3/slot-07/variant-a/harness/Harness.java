import java.net.ServerSocket;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.TreeSet;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import sivaku.harness.Check;
import sivaku.harness.NoReply;

/**
 * Hidden tests for the fixed TicketServer, on a slow store that sleeps
 * between a read and the write after it (SlowStore), so an unsafe
 * nextTicket() hands out a number twice every time: a second client
 * answered while the first is connected (4 points), the protocol for one
 * client, and many clients at once (unique numbers, no gaps, the stored value).
 */
public class Harness {
    private static final int WAIT = 2000;

    /** What a command needs a reply to, as tests.json "needs" names it: the command, or "other" for an ERROR. */
    private static String need(String command) {
        return switch (command) {
            case "HELLO", "TICKET", "BYE" -> command;
            default -> "other";
        };
    }

    /** Sends a command and returns the reply; no reply within WAIT ends the case (NoReply). */
    private static String ask(TestClient client, String command) throws Exception {
        return ask(client, command, need(command));
    }

    /** The same, naming what the missing reply means: e.g. "concurrent" for a second client. */
    private static String ask(TestClient client, String command, String need) throws Exception {
        String reply = client.send(command);
        if (reply.equals("(no reply)")) {
            String shown = command.isEmpty() ? "an empty line" : command;
            throw new NoReply(need, "no reply to " + shown + " within " + WAIT / 1000 + " seconds");
        }
        return reply;
    }

    /** The student's server on its own thread, with a store starting at `start`. */
    static final class Running {
        final SlowStore store;
        final ServerSocket listener;

        Running(int start) throws Exception {
            store = new SlowStore(start);
            TicketServer server = new TicketServer(store);
            listener = new ServerSocket(0);
            Thread serving = new Thread(() -> {
                try {
                    server.serve(listener);
                } catch (Exception ignored) {
                    // the listener was closed
                }
            });
            serving.setDaemon(true);
            serving.start();
        }

        TestClient client() throws Exception {
            return new TestClient(listener.getLocalPort(), WAIT);
        }

        void stop() throws Exception {
            listener.close();
        }
    }

    /**
     * `clients` clients connect at once, each takes `each` tickets, and each
     * stays connected until all have theirs, so they are served at the same
     * time. A server that serves one client at a time cannot do that: every
     * client gives up waiting at the same deadline, and the case fails.
     * Returns every number handed out.
     */
    private static List<Integer> crowd(Running running, int clients, int each) throws Exception {
        CountDownLatch connected = new CountDownLatch(clients);
        CountDownLatch served = new CountDownLatch(clients);
        long deadline = System.currentTimeMillis() + WAIT;
        List<String> late = Collections.synchronizedList(new ArrayList<>());
        NoReply[] silence = new NoReply[1];
        List<Integer> numbers = Collections.synchronizedList(new ArrayList<>());
        List<String> problems = Collections.synchronizedList(new ArrayList<>());
        List<Thread> threads = new ArrayList<>();
        for (int c = 0; c < clients; c++) {
            threads.add(new Thread(() -> {
                try (TestClient client = running.client()) {
                    connected.countDown();
                    connected.await(WAIT, TimeUnit.MILLISECONDS);
                    for (int k = 0; k < each; k++) {
                        String reply = ask(client, "TICKET");
                        if (reply.startsWith("TICKET ")) {
                            numbers.add(Integer.parseInt(reply.substring(7)));
                        } else {
                            problems.add(reply);
                        }
                    }
                    served.countDown();
                    if (!served.await(Math.max(0, deadline - System.currentTimeMillis()), TimeUnit.MILLISECONDS)) {
                        late.add("x");
                    }
                    ask(client, "BYE");
                } catch (NoReply e) {
                    silence[0] = e;
                } catch (Exception e) {
                    problems.add(e.toString());
                }
            }));
        }
        for (Thread t : threads) {
            t.start();
        }
        for (Thread t : threads) {
            t.join(4 * WAIT);
        }
        if (silence[0] != null) {
            throw silence[0];
        }
        Check.equal("replies to TICKET that were not a ticket", "[]", problems.toString());
        Check.isTrue("all " + clients + " clients were served while all were connected", late.isEmpty());
        return numbers;
    }

    public static void sampleFromTheHandout() throws Exception {
        TicketServer server = new TicketServer(new MemoryStore(100));
        ServerSocket listener = new ServerSocket(0);
        Thread serving = new Thread(() -> {
            try {
                server.serve(listener);
            } catch (Exception ignored) {
                // the listener was closed
            }
        });
        serving.setDaemon(true);
        serving.start();
        List<String> replies = new ArrayList<>();
        for (int visitor = 1; visitor <= 2; visitor++) {
            try (TestClient client = new TestClient(listener.getLocalPort(), WAIT)) {
                for (String command : new String[] {"HELLO", "TICKET", "BYE"}) {
                    replies.add(ask(client, command));
                }
            }
        }
        listener.close();
        Check.equal("replies to HELLO, TICKET, BYE from two clients in turn",
                "WELCOME | TICKET 101 | BYE | WELCOME | TICKET 102 | BYE", String.join(" | ", replies));
    }

    public static void secondClientWhileFirstIsConnected() throws Exception {
        Running running = new Running(0);
        try (TestClient first = running.client()) {
            Check.equal("the first client's HELLO", "WELCOME", ask(first, "HELLO"));
            try (TestClient second = running.client()) {
                Check.equal("a second client's HELLO while the first is still connected", "WELCOME", ask(second, "HELLO", "concurrent"));
                Check.equal("the second client's TICKET", "TICKET 1", ask(second, "TICKET"));
                ask(second, "BYE");
            }
            Check.equal("the first client's TICKET after that", "TICKET 2", ask(first, "TICKET"));
            ask(first, "BYE");
        }
        running.stop();
    }

    public static void oneClientTakesTickets() throws Exception {
        Running running = new Running(5);
        try (TestClient client = running.client()) {
            Check.equal("replies to HELLO, TICKET, TICKET, BYE", "WELCOME | TICKET 6 | TICKET 7 | BYE",
                    String.join(" | ", ask(client, "HELLO"), ask(client, "TICKET"), ask(client, "TICKET"), ask(client, "BYE")));
        }
        running.stop();
    }

    public static void unknownCommands() throws Exception {
        Running running = new Running(0);
        try (TestClient client = running.client()) {
            Check.equal("replies to hello, an empty line, TICKETS, TICKET", "ERROR | ERROR | ERROR | TICKET 1",
                    String.join(" | ", ask(client, "hello"), ask(client, ""), ask(client, "TICKETS"), ask(client, "TICKET")));
        }
        running.stop();
    }

    public static void manyClientsGetDifferentNumbers() throws Exception {
        Running running = new Running(0);
        List<Integer> numbers = crowd(running, 8, 2);
        running.stop();
        Check.equal("different numbers among the 16 tickets 8 clients took at once", 16, new TreeSet<>(numbers).size());
    }

    public static void byeClosesAndTheServerCarriesOn() throws Exception {
        Running running = new Running(0);
        try (TestClient client = running.client()) {
            Check.equal("reply to BYE", "BYE", ask(client, "BYE"));
            Check.equal("the connection after BYE", "(closed)", client.read());
        }
        try (TestClient next = running.client()) {
            Check.equal("the next client's TICKET", "TICKET 1", ask(next, "TICKET"));
        }
        running.stop();
    }

    public static void manyClientsLeaveNoGaps() throws Exception {
        Running running = new Running(0);
        List<Integer> numbers = crowd(running, 8, 3);
        running.stop();
        List<Integer> expected = new ArrayList<>();
        for (int n = 1; n <= 24; n++) {
            expected.add(n);
        }
        Check.equal("the numbers 8 clients took at once, 3 each, sorted", expected.toString(),
                new ArrayList<>(new TreeSet<>(numbers)).toString() + (numbers.size() == 24 ? "" : " (" + numbers.size() + " tickets)"));
    }

    public static void storeHoldsTheLastNumber() throws Exception {
        Running running = new Running(0);
        List<Integer> numbers = crowd(running, 8, 3);
        running.stop();
        Check.equal("tickets handed out", 24, numbers.size());
        Check.equal("the number stored once 8 clients took 3 tickets each", 24, running.store.peek());
    }

    public static void numbersContinueFromTheStore() throws Exception {
        Running running = new Running(500);
        List<Integer> numbers = crowd(running, 6, 2);
        running.stop();
        Check.equal("the lowest and highest of 12 tickets from a store holding 500", "501 to 512",
                numbers.isEmpty() ? "none" : Collections.min(numbers) + " to " + Collections.max(numbers));
        Check.equal("different numbers among them", 12, new TreeSet<>(numbers).size());
        Check.equal("the number stored", 512, running.store.peek());
    }
}
