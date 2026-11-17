// Complete: you do not need to open or change this file.
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * The points server. It accepts clients in a loop and starts a new thread
 * for each one, which calls PointsHandler.handle with that client's socket.
 */
public class PointsServer implements Runnable {
    private final ServerSocket listener;

    public PointsServer(ServerSocket listener) {
        this.listener = listener;
    }

    @Override
    public void run() {
        while (true) {
            Socket client;
            try {
                client = listener.accept();
            } catch (IOException e) {
                return;
            }
            new Thread(() -> {
                try {
                    PointsHandler.handle(client);
                } catch (IOException e) {
                    System.out.println("Connection failed: " + e.getMessage());
                }
            }).start();
        }
    }
}
