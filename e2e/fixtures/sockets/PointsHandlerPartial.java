import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;

/** Unfinished: ADD, SHOW and BYE work; RESET and anything else get no reply. */
public class PointsHandler {
    public static void handle(Socket client) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
        PrintWriter out = new PrintWriter(client.getOutputStream(), true);
        int points = 0;
        String line;
        while ((line = in.readLine()) != null) {
            if (line.startsWith("ADD ")) {
                points += Integer.parseInt(line.substring(4));
                out.println("POINTS " + points);
            } else if (line.equals("SHOW")) {
                out.println("POINTS " + points);
            } else if (line.equals("BYE")) {
                out.println("BYE");
                client.close();
                return;
            }
        }
    }
}
