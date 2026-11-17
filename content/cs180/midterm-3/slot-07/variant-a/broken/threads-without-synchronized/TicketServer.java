import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;

/** A museum's ticket server. */
public class TicketServer {
    private final NumberStore store;

    public TicketServer(NumberStore store) {
        this.store = store;
    }

    /** Accepts clients for ever. Throws once the listener is closed. */
    public void serve(ServerSocket listener) throws IOException {
        while (true) {
            Socket client = listener.accept();
            new Thread(() -> {
                try {
                    handle(client);
                } catch (IOException e) {
                    // this client's connection failed; the others carry on
                }
            }).start();
        }
    }

    /** One client's conversation. */
    private void handle(Socket client) throws IOException {
        try (client) {
            BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
            PrintWriter out = new PrintWriter(client.getOutputStream(), true);
            String line;
            while ((line = in.readLine()) != null) {
                if (line.equals("HELLO")) {
                    out.println("WELCOME");
                } else if (line.equals("TICKET")) {
                    out.println("TICKET " + nextTicket());
                } else if (line.equals("BYE")) {
                    out.println("BYE");
                    return;
                } else {
                    out.println("ERROR");
                }
            }
        }
    }

    /** The next ticket number: one more than the store holds, which is then stored. */
    private int nextTicket() {
        int next = store.get() + 1;
        store.set(next);
        return next;
    }
}
