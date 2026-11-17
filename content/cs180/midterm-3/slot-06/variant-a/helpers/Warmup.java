/**
 * Hidden: runs the student's handler once on one connection before Run and
 * before each test. In CheerpJ, when several threads first run code whose
 * calls have not been made yet with the classes they now see, one thread
 * can silently die. So this uses exactly the classes the concurrent test
 * uses (HiddenServer and TestClient) and no others
 * (java/proofs/m3/cheerpj-thread-death, README).
 */
public class Warmup {
    public static void warmUp() {
        HiddenServer server = null;
        try {
            server = new HiddenServer();
            try (TestClient client = new TestClient(server.port(), 300)) {
                for (String command : new String[] {"ADD 2", "SHOW", "RESET", "ADD x", "", "BYE"}) {
                    if (client.send(command).startsWith("(")) {
                        break;
                    }
                }
            }
            server.endings(1, 300);
        } catch (Throwable ignored) {
            // An unfinished handler: the tests will say so.
        } finally {
            try {
                if (server != null) {
                    server.close();
                }
            } catch (Exception ignored) {
                // closing a fake listener does not fail
            }
        }
    }
}
