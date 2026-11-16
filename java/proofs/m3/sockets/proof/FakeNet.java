import java.util.HashMap;
import java.util.Map;

/** The fake network: which fake server listens on which port. */
final class FakeNet {
    private static final Map<Integer, FakeServerSocket> SERVERS = new HashMap<>();

    private FakeNet() {
    }

    static synchronized void listen(int port, FakeServerSocket server) throws java.net.BindException {
        if (SERVERS.containsKey(port)) {
            throw new java.net.BindException("Address already in use: " + port);
        }
        SERVERS.put(port, server);
    }

    static synchronized void unlisten(int port, FakeServerSocket server) {
        SERVERS.remove(port, server);
    }

    /** Connects {@code client} to the server on {@code port}; returns the server's end, or null if none listens. */
    static FakeSocket connect(int port, FakeSocket client) {
        FakeServerSocket server;
        synchronized (FakeNet.class) {
            server = SERVERS.get(port);
        }
        if (server == null) {
            return null;
        }
        FakeSocket serverEnd = FakeSocket.pair()[1];
        client.attach(serverEnd);
        server.waiting.add(serverEnd);
        return serverEnd;
    }
}
