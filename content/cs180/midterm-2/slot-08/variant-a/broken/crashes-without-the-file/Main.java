void main() throws IOException {
    BufferedReader reader = new BufferedReader(new FileReader("temperatures.txt"));

    int count = 0;
    int sum = 0;
    int lowest = 0;
    int below = 0;
    String line;
    while ((line = reader.readLine()) != null) {
        int reading = Integer.parseInt(line.trim());
        if (count == 0 || reading < lowest) {
            lowest = reading;
        }
        if (reading < 0) {
            below++;
        }
        sum += reading;
        count++;
    }
    reader.close();

    PrintWriter writer = new PrintWriter(new FileOutputStream("summary.txt"));
    writer.println("Readings: " + count);
    writer.printf("Average: %.2f%n", (double) sum / count);
    writer.println("Lowest: " + lowest);
    writer.println("Below zero: " + below);
    writer.close();
}
