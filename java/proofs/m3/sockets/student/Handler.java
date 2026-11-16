import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;

/** Topic F as a student writes it: one conversation, a running total. */
public class Handler {
    public static void handle(Socket client) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
        PrintWriter out = new PrintWriter(client.getOutputStream(), true);
        int total = 0;
        String line;
        while ((line = in.readLine()) != null) {
            if (line.equals("BYE")) {
                out.println("GOODBYE");
                client.close();
                return;
            }
            if (line.startsWith("ADD ")) {
                total += Integer.parseInt(line.substring(4));
                out.println("TOTAL " + total);
            } else {
                out.println("ERROR");
            }
        }
    }
}
