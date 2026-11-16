import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;

/** Topic G as a student fixes it: a thread per client, and a synchronised counter. */
public class StudentServer {
    private static int issued;

    public static void serve(int port, int clients) throws IOException, InterruptedException {
        ServerSocket server = new ServerSocket(port);
        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < clients; i++) {
            Socket client = server.accept();
            Thread t = new Thread(() -> handle(client));
            t.start();
            threads.add(t);
        }
        for (Thread t : threads) {
            t.join();
        }
        server.close();
    }

    private static synchronized int next() {
        return ++issued;
    }

    private static void handle(Socket client) {
        try (client) {
            BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
            PrintWriter out = new PrintWriter(client.getOutputStream(), true);
            String name = in.readLine();
            out.println("TICKET " + next() + " " + name);
        } catch (IOException e) {
            // The client hung up.
        }
    }
}
