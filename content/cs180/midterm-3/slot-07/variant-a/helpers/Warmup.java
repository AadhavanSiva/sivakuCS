import java.net.ServerSocket;

/**
 * Hidden: runs the student's server once, for one client, before Run and
 * before each test. In CheerpJ, when several threads first run code whose
 * calls have not been made yet with the classes they now see, one thread
 * can silently die. So this uses exactly the classes the concurrent tests
 * use (SlowStore and TestClient) and no others
 * (java/proofs/m3/cheerpj-thread-death, README).
 */
public class Warmup {
    public static void warmUp() {
        ServerSocket listener = null;
        try {
            TicketServer server = new TicketServer(new SlowStore(0));
            ServerSocket open = new ServerSocket(0);
            listener = open;
            Thread serving = new Thread(() -> {
                try {
                    server.serve(open);
                } catch (Exception ignored) {
                    // the listener was closed
                }
            });
            serving.setDaemon(true);
            serving.start();
            try (TestClient client = new TestClient(open.getLocalPort(), 300)) {
                for (String command : new String[] {"HELLO", "TICKET", "BYE"}) {
                    if (client.send(command).startsWith("(")) {
                        break;
                    }
                }
            }
        } catch (Throwable ignored) {
            // An unfinished server: the tests will say so.
        } finally {
            try {
                if (listener != null) {
                    listener.close();
                }
            } catch (Exception ignored) {
                // closing a fake listener does not fail
            }
        }
    }
}
