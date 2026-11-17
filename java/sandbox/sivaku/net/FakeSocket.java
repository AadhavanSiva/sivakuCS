package sivaku.net;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ConnectException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketAddress;
import java.net.SocketException;

/**
 * What {@code new Socket(...)} becomes in the run's code (the sandbox
 * rewrites it when compiling): a Socket whose streams are in-memory pipes to
 * a {@link FakeServerSocket} on the same port. Real sockets cannot work in
 * CheerpJ (java/proofs/m3/sockets), and the same fakes on the JDK make
 * `npm run verify` grade exactly as the browser does.
 *
 * <p>Behaves as a TCP socket does for what students use: what one end
 * writes the other reads, in order; readLine() returns null once the other
 * end has closed and everything sent has been read; closing either stream
 * closes the socket; a read waits at most the SO_TIMEOUT.
 */
public class FakeSocket extends Socket {
    private Pipe incoming;
    private Pipe outgoing;
    private InputStream in;
    private OutputStream out;
    private int port;
    private int localPort;
    private int timeoutMs;
    private volatile boolean connected;
    private volatile boolean closed;
    private volatile boolean inputShutdown;
    private volatile boolean outputShutdown;

    /** {@code new Socket()}: unconnected until connect(). */
    public FakeSocket() throws SocketException {
        super(new NoImpl());
        FakeNet.opened(this);
    }

    /** {@code new Socket(host, port)}: connects to the fake server listening on port. */
    public FakeSocket(String host, int port) throws IOException {
        this();
        connectTo(host, port);
    }

    public FakeSocket(InetAddress address, int port) throws IOException {
        this();
        connectTo(address == null ? "localhost" : address.getHostAddress(), port);
    }

    public FakeSocket(String host, int port, InetAddress localAddress, int localPort) throws IOException {
        this(host, port);
    }

    public FakeSocket(InetAddress address, int port, InetAddress localAddress, int localPort) throws IOException {
        this(address, port);
    }

    /** The server's end of a new connection. */
    FakeSocket(Pipe incoming, Pipe outgoing, int port, int localPort) throws SocketException {
        this();
        attach(incoming, outgoing, port, localPort);
    }

    private void attach(Pipe incoming, Pipe outgoing, int port, int localPort) {
        this.incoming = incoming;
        this.outgoing = outgoing;
        this.port = port;
        this.localPort = localPort;
        incoming.timeoutMs = timeoutMs;
        this.in = new InputStream() {
            @Override
            public int read() throws IOException {
                return inputShutdown ? -1 : incoming.in.read();
            }

            @Override
            public int read(byte[] b, int off, int len) throws IOException {
                return inputShutdown ? -1 : incoming.in.read(b, off, len);
            }

            @Override
            public int available() throws IOException {
                return inputShutdown ? 0 : incoming.in.available();
            }

            @Override
            public void close() {
                FakeSocket.this.close();
            }
        };
        this.out = new OutputStream() {
            @Override
            public void write(int b) throws IOException {
                outgoing.out.write(b);
            }

            @Override
            public void write(byte[] b, int off, int len) throws IOException {
                outgoing.out.write(b, off, len);
            }

            @Override
            public void close() {
                FakeSocket.this.close();
            }
        };
        connected = true;
    }

    private void connectTo(String host, int port) throws IOException {
        if (closed) {
            throw new SocketException("Socket is closed");
        }
        if (connected) {
            throw new SocketException("already connected");
        }
        if (port < 0 || port > 0xFFFF) {
            throw new IllegalArgumentException("port out of range: " + port);
        }
        FakeServerSocket server = FakeNet.server(port);
        if (server == null) {
            throw new ConnectException("Connection refused: " + host + ":" + port);
        }
        Pipe toServer = new Pipe();
        Pipe toClient = new Pipe();
        int local = FakeServerSocket.ephemeralPort();
        attach(toClient, toServer, port, local);
        if (!server.enqueue(new FakeSocket(toServer, toClient, local, port))) {
            close();
            throw new ConnectException("Connection refused: " + host + ":" + port);
        }
    }

    @Override
    public void connect(SocketAddress endpoint) throws IOException {
        connect(endpoint, 0);
    }

    @Override
    public void connect(SocketAddress endpoint, int timeout) throws IOException {
        if (!(endpoint instanceof InetSocketAddress address)) {
            throw new IllegalArgumentException("Unsupported address type");
        }
        connectTo(address.getHostString(), address.getPort());
    }

    @Override
    public void bind(SocketAddress bindpoint) {
    }

    @Override
    public InputStream getInputStream() throws IOException {
        if (closed) {
            throw new SocketException("Socket is closed");
        }
        if (!connected) {
            throw new SocketException("Socket is not connected");
        }
        if (inputShutdown) {
            throw new SocketException("Socket input is shutdown");
        }
        return in;
    }

    @Override
    public OutputStream getOutputStream() throws IOException {
        if (closed) {
            throw new SocketException("Socket is closed");
        }
        if (!connected) {
            throw new SocketException("Socket is not connected");
        }
        if (outputShutdown) {
            throw new SocketException("Socket output is shutdown");
        }
        return out;
    }

    @Override
    public synchronized void setSoTimeout(int timeout) throws SocketException {
        if (closed) {
            throw new SocketException("Socket is closed");
        }
        if (timeout < 0) {
            throw new IllegalArgumentException("timeout can't be negative");
        }
        timeoutMs = timeout;
        if (incoming != null) {
            incoming.timeoutMs = timeout;
        }
    }

    @Override
    public synchronized int getSoTimeout() throws SocketException {
        if (closed) {
            throw new SocketException("Socket is closed");
        }
        return timeoutMs;
    }

    @Override
    public void shutdownInput() throws IOException {
        if (closed || !connected) {
            throw new SocketException(closed ? "Socket is closed" : "Socket is not connected");
        }
        inputShutdown = true;
    }

    @Override
    public void shutdownOutput() throws IOException {
        if (closed || !connected) {
            throw new SocketException(closed ? "Socket is closed" : "Socket is not connected");
        }
        outputShutdown = true;
        outgoing.closeWriter();
    }

    @Override
    public boolean isInputShutdown() {
        return inputShutdown;
    }

    @Override
    public boolean isOutputShutdown() {
        return outputShutdown;
    }

    @Override
    public boolean isConnected() {
        return connected;
    }

    @Override
    public boolean isBound() {
        return connected;
    }

    @Override
    public boolean isClosed() {
        return closed;
    }

    @Override
    public int getPort() {
        return connected ? port : 0;
    }

    @Override
    public int getLocalPort() {
        return connected ? localPort : -1;
    }

    @Override
    public InetAddress getInetAddress() {
        return connected ? loopback() : null;
    }

    @Override
    public InetAddress getLocalAddress() {
        return loopback();
    }

    @Override
    public SocketAddress getRemoteSocketAddress() {
        return connected ? InetSocketAddress.createUnresolved("localhost", port) : null;
    }

    @Override
    public SocketAddress getLocalSocketAddress() {
        return connected ? InetSocketAddress.createUnresolved("localhost", localPort) : null;
    }

    private static InetAddress loopback() {
        try {
            return InetAddress.getLoopbackAddress();
        } catch (Throwable e) {
            return null;
        }
    }

    // Options a real socket has; here they change nothing.
    @Override
    public void setTcpNoDelay(boolean on) {
    }

    @Override
    public boolean getTcpNoDelay() {
        return true;
    }

    @Override
    public void setKeepAlive(boolean on) {
    }

    @Override
    public boolean getKeepAlive() {
        return false;
    }

    @Override
    public void setReuseAddress(boolean on) {
    }

    @Override
    public boolean getReuseAddress() {
        return false;
    }

    @Override
    public void setSoLinger(boolean on, int linger) {
    }

    @Override
    public int getSoLinger() {
        return -1;
    }

    @Override
    public void setSendBufferSize(int size) {
    }

    @Override
    public int getSendBufferSize() {
        return 65536;
    }

    @Override
    public void setReceiveBufferSize(int size) {
    }

    @Override
    public int getReceiveBufferSize() {
        return 65536;
    }

    @Override
    public void close() {
        synchronized (this) {
            if (closed) {
                return;
            }
            closed = true;
        }
        if (connected) {
            outgoing.closeWriter();
            incoming.closeReader();
        }
    }

    /** Whether the other end has closed its output (for the tests' servers). */
    public boolean peerClosed() {
        return connected && incoming.writerClosed();
    }

    @Override
    public String toString() {
        return connected ? "Socket[addr=localhost/127.0.0.1,port=" + port + ",localport=" + localPort + "]"
                : "Socket[unconnected]";
    }
}
