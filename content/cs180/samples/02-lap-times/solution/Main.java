import java.io.File;
import java.io.FileNotFoundException;
import java.io.PrintWriter;
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        int count = 0;
        double total = 0;
        double fastest = Double.MAX_VALUE;
        try (Scanner in = new Scanner(new File("laps.txt"))) {
            while (in.hasNextLine()) {
                String line = in.nextLine().trim();
                if (line.isEmpty()) {
                    continue;
                }
                double time = Double.parseDouble(line);
                count++;
                total += time;
                fastest = Math.min(fastest, time);
            }
        } catch (FileNotFoundException e) {
            count = 0;
        }

        if (count == 0) {
            System.out.println("No laps recorded.");
            return;
        }
        try (PrintWriter out = new PrintWriter("best.txt")) {
            out.println("Laps: " + count);
            out.printf("Fastest: %.2f%n", fastest);
            out.printf("Average: %.2f%n", total / count);
        } catch (FileNotFoundException e) {
            System.out.println("Could not write best.txt");
        }
    }
}
