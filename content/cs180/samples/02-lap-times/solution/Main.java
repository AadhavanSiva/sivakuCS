void main() {
    int count = 0;
    double total = 0;
    double fastest = Double.MAX_VALUE;
    try (BufferedReader in = new BufferedReader(new FileReader("laps.txt"))) {
        String line;
        while ((line = in.readLine()) != null) {
            line = line.trim();
            if (line.isEmpty()) {
                continue;
            }
            double time = Double.parseDouble(line);
            count++;
            total += time;
            fastest = Math.min(fastest, time);
        }
    } catch (IOException e) {
        count = 0;
    }

    if (count == 0) {
        IO.println("No laps recorded.");
        return;
    }
    try (PrintWriter out = new PrintWriter("best.txt")) {
        out.println("Laps: " + count);
        out.println(String.format("Fastest: %.2f", fastest));
        out.println(String.format("Average: %.2f", total / count));
    } catch (IOException e) {
        IO.println("Could not write best.txt");
    }
}
