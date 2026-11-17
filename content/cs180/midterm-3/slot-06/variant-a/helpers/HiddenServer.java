import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;

/**
 * Hidden: the server the tests use, the same as PointsServer but recording
 * how each handler ended: "returned", or the exception it threw.
 */
public class HiddenServer {
    private final ServerSocket listener;
    private final List<String> endings = new ArrayList<>();

    public HiddenServer() throws IOException {
        listener = new ServerSocket(0);
        Thread acceptor = new Thread(() -> {
            while (true) {
                Socket client;
                try {
                    client = listener.accept();
                } catch (IOException e) {
                    return;
                }
                Thread handler = new Thread(() -> {
                    String ending = "returned";
                    try {
                        PointsHandler.handle(client);
                    } catch (Throwable t) {
                        ending = "threw " + t;
                    }
                    synchronized (endings) {
                        endings.add(ending);
                        endings.notifyAll();
                    }
                });
                handler.setDaemon(true);
                handler.start();
            }
        });
        acceptor.setDaemon(true);
        acceptor.start();
    }

    public int port() {
        return listener.getLocalPort();
    }

    /** How the first `count` handlers ended, waiting up to `ms` for them; fewer if some have not. */
    public List<String> endings(int count, long ms) throws InterruptedException {
        long deadline = System.currentTimeMillis() + ms;
        synchronized (endings) {
            while (endings.size() < count && System.currentTimeMillis() < deadline) {
                endings.wait(Math.max(1, deadline - System.currentTimeMillis()));
            }
            return new ArrayList<>(endings);
        }
    }

    public void close() throws IOException {
        listener.close();
    }
}
