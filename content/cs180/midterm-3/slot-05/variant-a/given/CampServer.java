// Complete: you do not need to open or change this file.
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * A practice campsite server. It serves one client at a time. For each line
 * the client sends, a site name, it replies "BOOKED " and the site if the
 * site is free (booking it), or "FULL" if not.
 */
public class CampServer implements Runnable {
    private final ServerSocket listener;
    private final Set<String> free = new HashSet<>(List.of("lake-2", "ridge-7"));

    public CampServer(ServerSocket listener) {
        this.listener = listener;
    }

    @Override
    public void run() {
        while (true) {
            try (Socket client = listener.accept()) {
                BufferedReader in = new BufferedReader(new InputStreamReader(client.getInputStream()));
                PrintWriter out = new PrintWriter(client.getOutputStream(), true);
                String site;
                while ((site = in.readLine()) != null) {
                    out.println(free.remove(site) ? "BOOKED " + site : "FULL");
                }
            } catch (IOException e) {
                return;
            }
        }
    }
}
