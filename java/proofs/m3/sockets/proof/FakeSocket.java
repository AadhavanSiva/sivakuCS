import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;

/**
 * A Socket whose streams are in-memory pipes. A student's {@code new
 * Socket(host, port)} is rewritten to {@code new FakeSocket(host, port)},
 * which connects to the fake server registered on that port.
 */
public class FakeSocket extends Socket {
    private InputStream in;
    private OutputStream out;
    private volatile boolean closed;

    /** One end of a connected pair; see {@link #pair()}. */
    private FakeSocket(InputStream in, OutputStream out) throws java.net.SocketException {
        super(new NoImpl());
        this.in = in;
        this.out = out;
    }

    /** What {@code new Socket(host, port)} becomes. */
    public FakeSocket(String host, int port) throws IOException {
        super(new NoImpl());
        FakeSocket serverEnd = FakeNet.connect(port, this);
        if (serverEnd == null) {
            throw new java.net.ConnectException("Connection refused: " + host + ":" + port);
        }
    }

    /** Two connected ends: what one writes, the other reads. */
    public static FakeSocket[] pair() {
        Pipe toServer = new Pipe();
        Pipe toClient = new Pipe();
        try {
            return new FakeSocket[] {
                new FakeSocket(toClient.in, toServer.out),
                new FakeSocket(toServer.in, toClient.out),
            };
        } catch (java.net.SocketException e) {
            throw new IllegalStateException(e);
        }
    }

    void attach(FakeSocket other) {
        Pipe toOther = new Pipe();
        Pipe toThis = new Pipe();
        this.in = toThis.in;
        this.out = toOther.out;
        other.in = toOther.in;
        other.out = toThis.out;
    }

    @Override
    public InputStream getInputStream() throws IOException {
        if (closed) {
            throw new java.net.SocketException("Socket is closed");
        }
        return in;
    }

    @Override
    public OutputStream getOutputStream() throws IOException {
        if (closed) {
            throw new java.net.SocketException("Socket is closed");
        }
        return out;
    }

    @Override
    public boolean isConnected() {
        return true;
    }

    @Override
    public boolean isClosed() {
        return closed;
    }

    @Override
    public synchronized void close() {
        if (closed) {
            return;
        }
        closed = true;
        try {
            out.close();
            in.close();
        } catch (IOException ignored) {
            // Pipes do not fail to close.
        }
    }
}
