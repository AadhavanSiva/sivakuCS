package sivaku.net;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketAddress;
import java.net.SocketException;
import java.net.SocketTimeoutException;
import java.util.ArrayDeque;

/**
 * What {@code new ServerSocket(...)} becomes in the run's code: it listens
 * on a port of the simulated network ({@link FakeNet}), and accept() hands
 * out the server's end of each {@link FakeSocket} that connects. Port 0
 * picks a free port, as on a real machine; a port already in use throws
 * BindException. close() makes a waiting accept() throw SocketException.
 */
public class FakeServerSocket extends ServerSocket {
    private static int nextEphemeral = 40000;

    private final ArrayDeque<FakeSocket> waiting = new ArrayDeque<>();
    private int port = -1;
    private int timeoutMs;
    private boolean closed;

    /** {@code new ServerSocket()}: unbound until bind(). */
    public FakeServerSocket() throws IOException {
        super(new NoImpl());
    }

    public FakeServerSocket(int port) throws IOException {
        this();
        this.port = FakeNet.listen(port, this);
    }

    public FakeServerSocket(int port, int backlog) throws IOException {
        this(port);
    }

    public FakeServerSocket(int port, int backlog, InetAddress bindAddr) throws IOException {
        this(port);
    }

    static synchronized int ephemeralPort() {
        return nextEphemeral++;
    }

    @Override
    public void bind(SocketAddress endpoint) throws IOException {
        bind(endpoint, 50);
    }

    @Override
    public synchronized void bind(SocketAddress endpoint, int backlog) throws IOException {
        if (closed) {
            throw new SocketException("Socket is closed");
        }
        if (port != -1) {
            throw new SocketException("Already bound");
        }
        int wanted = endpoint instanceof InetSocketAddress address ? address.getPort() : 0;
        port = FakeNet.listen(wanted, this);
    }

    /** A client connected; false if this server is closed. */
    synchronized boolean enqueue(FakeSocket serverEnd) {
        if (closed) {
            return false;
        }
        waiting.add(serverEnd);
        notifyAll();
        return true;
    }

    @Override
    public Socket accept() throws IOException {
        synchronized (this) {
            if (port == -1 && !closed) {
                throw new SocketException("Socket is not bound yet");
            }
            long deadline = timeoutMs > 0 ? System.currentTimeMillis() + timeoutMs : 0;
            while (waiting.isEmpty() && !closed) {
                long wait = 0;
                if (deadline != 0) {
                    wait = deadline - System.currentTimeMillis();
                    if (wait <= 0) {
                        throw new SocketTimeoutException("Accept timed out");
                    }
                }
                try {
                    wait(wait);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new SocketException("Interrupted");
                }
            }
            if (closed) {
                throw new SocketException("Socket closed");
            }
            return waiting.poll();
        }
    }

    @Override
    public synchronized void setSoTimeout(int timeout) throws SocketException {
        if (closed) {
            throw new SocketException("Socket is closed");
        }
        if (timeout < 0) {
            throw new IllegalArgumentException("timeout < 0");
        }
        timeoutMs = timeout;
    }

    @Override
    public synchronized int getSoTimeout() throws IOException {
        if (closed) {
            throw new SocketException("Socket is closed");
        }
        return timeoutMs;
    }

    @Override
    public void setReuseAddress(boolean on) {
    }

    @Override
    public boolean getReuseAddress() {
        return true;
    }

    @Override
    public void setReceiveBufferSize(int size) {
    }

    @Override
    public int getReceiveBufferSize() {
        return 65536;
    }

    @Override
    public synchronized int getLocalPort() {
        return port;
    }

    @Override
    public InetAddress getInetAddress() {
        try {
            return InetAddress.getLoopbackAddress();
        } catch (Throwable e) {
            return null;
        }
    }

    @Override
    public synchronized SocketAddress getLocalSocketAddress() {
        return port == -1 ? null : InetSocketAddress.createUnresolved("localhost", port);
    }

    @Override
    public synchronized boolean isBound() {
        return port != -1;
    }

    @Override
    public synchronized boolean isClosed() {
        return closed;
    }

    @Override
    public void close() {
        FakeSocket[] unaccepted;
        synchronized (this) {
            if (closed) {
                return;
            }
            closed = true;
            notifyAll();
            unaccepted = waiting.toArray(new FakeSocket[0]);
            waiting.clear();
        }
        if (port != -1) {
            FakeNet.unlisten(port, this);
        }
        // Clients still waiting to be accepted see the connection close.
        for (FakeSocket socket : unaccepted) {
            socket.close();
        }
    }

    @Override
    public synchronized String toString() {
        return port == -1 ? "ServerSocket[unbound]" : "ServerSocket[addr=0.0.0.0/0.0.0.0,localport=" + port + "]";
    }
}
