import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;

/** Topic E as a student writes it: send names until one is accepted. */
public class StudentClient {
    public static String claim(String host, int port, String[] names) throws IOException {
        Socket socket = new Socket(host, port);
        try {
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
            PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
            for (String name : names) {
                out.println(name);
                String reply = in.readLine();
                if (reply == null) {
                    return null;
                }
                if (reply.equals("OK")) {
                    return name;
                }
            }
            return null;
        } finally {
            socket.close();
        }
    }
}
