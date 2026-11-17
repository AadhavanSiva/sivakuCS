import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;

public class CampClient {
    /**
     * Tries to book each site in turn, over one connection to the server.
     *
     * @param host the server's host name
     * @param port the server's port
     * @param sites the sites to try, in order
     * @return the first site booked, or null if every site is full or the server hangs up
     */
    public static String book(String host, int port, String[] sites) throws IOException {
        try (Socket socket = new Socket(host, port)) {
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
            for (String site : sites) {
                out.println(site);
                String reply = in.readLine();
                if (reply == null) {
                    return null;
                }
                if (reply.startsWith("BOOKED")) {
                    return site;
                }
            }
            return null;
        }
    }
}
