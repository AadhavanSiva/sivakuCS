import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.SocketAddress;
import java.net.SocketException;
import java.net.SocketImpl;

/**
 * An implementation that is never used, handed to Socket's and
 * ServerSocket's protected constructors so the fakes never create the
 * platform's real one (which CheerpJ cannot initialise).
 */
final class NoImpl extends SocketImpl {
    private static IOException unsupported() {
        return new SocketException("not a real socket");
    }

    @Override
    protected void create(boolean stream) throws IOException {
        throw unsupported();
    }

    @Override
    protected void connect(String host, int port) throws IOException {
        throw unsupported();
    }

    @Override
    protected void connect(InetAddress address, int port) throws IOException {
        throw unsupported();
    }

    @Override
    protected void connect(SocketAddress address, int timeout) throws IOException {
        throw unsupported();
    }

    @Override
    protected void bind(InetAddress host, int port) throws IOException {
        throw unsupported();
    }

    @Override
    protected void listen(int backlog) throws IOException {
        throw unsupported();
    }

    @Override
    protected void accept(SocketImpl s) throws IOException {
        throw unsupported();
    }

    @Override
    protected InputStream getInputStream() throws IOException {
        throw unsupported();
    }

    @Override
    protected OutputStream getOutputStream() throws IOException {
        throw unsupported();
    }

    @Override
    protected int available() throws IOException {
        throw unsupported();
    }

    @Override
    protected void close() {
    }

    @Override
    protected void sendUrgentData(int data) throws IOException {
        throw unsupported();
    }

    @Override
    public void setOption(int optID, Object value) throws SocketException {
    }

    @Override
    public Object getOption(int optID) throws SocketException {
        return null;
    }
}
