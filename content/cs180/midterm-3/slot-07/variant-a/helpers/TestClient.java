import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.net.SocketTimeoutException;

/** Hidden: one client conversation, for the tests and the warm-up. */
public class TestClient implements AutoCloseable {
    private final Socket socket;
    private final BufferedReader in;
    private final PrintWriter out;

    /** Connects; a reply that takes longer than timeoutMs counts as none. */
    public TestClient(int port, int timeoutMs) throws IOException {
        socket = new Socket("localhost", port);
        socket.setSoTimeout(timeoutMs);
        in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
        out = new PrintWriter(socket.getOutputStream(), true);
    }

    /** Sends a line and returns the reply: "(no reply)" if none came in time, "(closed)" if the server hung up. */
    public String send(String line) throws IOException {
        out.println(line);
        return read();
    }

    /** The next line: "(no reply)" if none came in time, "(closed)" if the server hung up. */
    public String read() throws IOException {
        try {
            String reply = in.readLine();
            return reply == null ? "(closed)" : reply;
        } catch (SocketTimeoutException e) {
            return "(no reply)";
        }
    }

    /** Whether another line arrives within ms, without being asked for. */
    public boolean extraLine(long ms) throws Exception {
        Thread.sleep(ms);
        return in.ready();
    }

    @Override
    public void close() throws IOException {
        socket.close();
    }
}
