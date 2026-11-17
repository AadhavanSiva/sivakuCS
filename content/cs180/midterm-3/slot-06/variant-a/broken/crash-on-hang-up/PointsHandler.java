import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;

public class PointsHandler {
    public static void handle(Socket client) throws IOException {
        BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
        PrintWriter out = new PrintWriter(client.getOutputStream(), true);
        int points = 0;
        while (true) {
            String line = in.readLine();
            String[] words = line.split(" ");
            if (line.equals("BYE")) {
                out.println("BYE");
                client.close();
                return;
            } else if (line.equals("SHOW")) {
                out.println("POINTS " + points);
            } else if (line.equals("RESET")) {
                points = 0;
                out.println("POINTS 0");
            } else if (words.length == 2 && words[0].equals("ADD")) {
                try {
                    points += Integer.parseInt(words[1]);
                    out.println("POINTS " + points);
                } catch (NumberFormatException e) {
                    out.println("ERROR");
                }
            } else {
                out.println("ERROR");
            }
        }
    }
}
