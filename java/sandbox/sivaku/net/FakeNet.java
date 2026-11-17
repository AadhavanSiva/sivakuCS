package sivaku.net;

import java.net.BindException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The simulated network: which fake server listens on which port, and every
 * socket opened during the run, so that {@link #reset()} can close them all
 * and no thread stays blocked in accept() or readLine() after the run.
 */
public final class FakeNet {
    private static final Map<Integer, FakeServerSocket> SERVERS = new HashMap<>();
    private static final List<FakeSocket> SOCKETS = new ArrayList<>();
    /** The next port for new ServerSocket(0), as an operating system would choose one. */
    private static int nextFreePort = 50000;

    private FakeNet() {
    }

    /** Closes every server and socket. Called before and after each run. */
    public static void reset() {
        List<FakeServerSocket> servers;
        List<FakeSocket> sockets;
        synchronized (FakeNet.class) {
            servers = new ArrayList<>(SERVERS.values());
            sockets = new ArrayList<>(SOCKETS);
            SERVERS.clear();
            SOCKETS.clear();
            nextFreePort = 50000;
        }
        for (FakeServerSocket server : servers) {
            server.close();
        }
        for (FakeSocket socket : sockets) {
            socket.close();
        }
    }

    /** Starts listening; port 0 picks a free one. Returns the port. */
    static synchronized int listen(int port, FakeServerSocket server) throws BindException {
        if (port < 0 || port > 0xFFFF) {
            throw new IllegalArgumentException("Port value out of range: " + port);
        }
        if (port == 0) {
            while (SERVERS.containsKey(nextFreePort)) {
                nextFreePort++;
            }
            port = nextFreePort++;
        }
        if (SERVERS.containsKey(port)) {
            throw new BindException("Address already in use: bind (port " + port + ")");
        }
        SERVERS.put(port, server);
        return port;
    }

    static synchronized void unlisten(int port, FakeServerSocket server) {
        SERVERS.remove(port, server);
    }

    static synchronized void opened(FakeSocket socket) {
        SOCKETS.add(socket);
    }

    /** The server listening on port, or null. */
    static synchronized FakeServerSocket server(int port) {
        return SERVERS.get(port);
    }
}
