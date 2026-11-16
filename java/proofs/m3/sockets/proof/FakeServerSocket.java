import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/** What a student's {@code new ServerSocket(port)} becomes: accept() hands out fake connections. */
public class FakeServerSocket extends ServerSocket {
    private final int port;
    final LinkedBlockingQueue<FakeSocket> waiting = new LinkedBlockingQueue<>();
    private volatile boolean closed;

    public FakeServerSocket(int port) throws IOException {
        super(new NoImpl());
        this.port = port;
        FakeNet.listen(port, this);
    }

    @Override
    public Socket accept() throws IOException {
        while (!closed) {
            try {
                FakeSocket next = waiting.poll(50, TimeUnit.MILLISECONDS);
                if (next != null) {
                    return next;
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new SocketException("interrupted");
            }
        }
        throw new SocketException("Socket is closed");
    }

    @Override
    public int getLocalPort() {
        return port;
    }

    @Override
    public boolean isClosed() {
        return closed;
    }

    @Override
    public void close() {
        closed = true;
        FakeNet.unlisten(port, this);
    }
}
