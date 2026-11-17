import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;

public class CampClient {
    public static String book(String host, int port, String[] sites) throws IOException {
        try (Socket socket = new Socket(host, port)) {
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
            for (String site : sites) {
                out.println(site);
            }
            for (String site : sites) {
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
