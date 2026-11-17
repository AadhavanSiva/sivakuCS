import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import sivaku.harness.Check;

/**
 * Hidden tests for CampClient: what book() returns (2 points each), then
 * how it talks to the server (1 point each). Each case runs its own test
 * server, which records every line it heard, whether a line arrived before
 * the reply to the one before, and whether the client closed the connection.
 */
public class Harness {
    /** A test server for one client. */
    static final class TestServer implements Runnable {
        private final ServerSocket listener;
        private final Set<String> free;
        /** Replies before hanging up (closing its side), or -1 for never. */
        private final int hangUpAfter;
        final List<String> heard = Collections.synchronizedList(new ArrayList<>());
        volatile String early;
        volatile boolean clientClosed;
        private volatile boolean accepted;
        private final Thread thread;

        TestServer(int hangUpAfter, String... free) throws IOException {
            this.listener = new ServerSocket(0);
            this.free = new HashSet<>(List.of(free));
            this.hangUpAfter = hangUpAfter;
            this.thread = new Thread(this);
            thread.setDaemon(true);
            thread.start();
        }

        int port() {
            return listener.getLocalPort();
        }

        @Override
        public void run() {
            try (Socket client = listener.accept()) {
                accepted = true;
                // A client that never closes the connection is noticed after this long.
                client.setSoTimeout(2000);
                BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
                PrintWriter out = new PrintWriter(client.getOutputStream(), true);
                int replies = 0;
                while (true) {
                    if (replies == hangUpAfter) {
                        client.shutdownOutput();
                    }
                    String line = in.readLine();
                    if (line == null) {
                        clientClosed = true;
                        return;
                    }
                    heard.add(line);
                    if (replies == hangUpAfter) {
                        continue;
                    }
                    // Give a client that does not wait for the reply time to send again.
                    Thread.sleep(25);
                    if (in.ready() && early == null) {
                        early = "sent \"" + in.readLine() + "\" before reading the reply to \"" + line + "\"";
                        heard.add("(early)");
                    }
                    out.println(free.remove(line) ? "BOOKED " + line : "FULL");
                    replies++;
                }
            } catch (SocketTimeoutException e) {
                clientClosed = false;
            } catch (IOException | InterruptedException e) {
                // the test reports what it saw
            }
        }

        /** Waits for the conversation to end and stops listening. */
        void finish() throws InterruptedException, IOException {
            // A client that never connected leaves nothing to wait for.
            thread.join(accepted ? 4000 : 50);
            listener.close();
        }
    }

    private static final String[] FIVE = {"cedar-1", "bay-2", "elm-3", "fir-4", "ash-5"};

    private static String book(TestServer server, String... sites) throws Exception {
        String booked = CampClient.book("localhost", server.port(), sites);
        server.finish();
        return booked;
    }

    public static void sampleFromTheHandout() throws Exception {
        ServerSocket listener = new ServerSocket(0);
        Thread server = new Thread(new CampServer(listener));
        server.setDaemon(true);
        server.start();
        int port = listener.getLocalPort();
        Check.equal("book(pine-1, lake-2, oak-3)", "lake-2",
                CampClient.book("localhost", port, new String[] {"pine-1", "lake-2", "oak-3"}));
        Check.equal("book(pine-1, lake-2) once lake-2 is taken", null,
                CampClient.book("localhost", port, new String[] {"pine-1", "lake-2"}));
        listener.close();
    }

    public static void bookedOnFirstTry() throws Exception {
        TestServer server = new TestServer(-1, "cedar-1");
        Check.equal("site booked", "cedar-1", book(server, "cedar-1", "bay-2", "elm-3"));
        Check.equal("lines the server received", "[cedar-1]", server.heard.toString());
    }

    public static void bookedOnMiddleTry() throws Exception {
        TestServer server = new TestServer(-1, "elm-3");
        Check.equal("site booked", "elm-3", book(server, FIVE));
        Check.equal("lines the server received", "[cedar-1, bay-2, elm-3]", server.heard.toString());
    }

    public static void bookedOnLastTry() throws Exception {
        TestServer server = new TestServer(-1, "ash-5", "oak-9");
        Check.equal("site booked", "ash-5", book(server, FIVE));
        Check.equal("lines the server received", "[cedar-1, bay-2, elm-3, fir-4, ash-5]", server.heard.toString());
    }

    public static void everySiteFull() throws Exception {
        TestServer server = new TestServer(-1, "oak-9");
        Check.equal("site booked", null, book(server, "cedar-1", "bay-2", "elm-3"));
        Check.equal("lines the server received", "[cedar-1, bay-2, elm-3]", server.heard.toString());
    }

    public static void serverHangsUpEarly() throws Exception {
        TestServer server = new TestServer(2, "fir-4");
        Check.equal("site booked when the server hangs up after two replies", null, book(server, FIVE));
    }

    public static void oneLineAtATime() throws Exception {
        TestServer server = new TestServer(-1, "fir-4");
        book(server, FIVE);
        Check.equal("lines sent before reading the reply to the one before", null, server.early);
    }

    public static void closesAfterBooking() throws Exception {
        TestServer server = new TestServer(-1, "bay-2");
        book(server, FIVE);
        Check.isTrue("the connection was closed after the booking", server.clientClosed);
    }

    public static void closesWhenEverySiteIsFull() throws Exception {
        TestServer server = new TestServer(-1);
        book(server, "cedar-1", "bay-2");
        Check.isTrue("the connection was closed when every site was full", server.clientClosed);
    }

    public static void closesAfterServerHangsUp() throws Exception {
        TestServer server = new TestServer(1, "elm-3");
        book(server, FIVE);
        Check.isTrue("the connection was closed after the server hung up", server.clientClosed);
    }
}
