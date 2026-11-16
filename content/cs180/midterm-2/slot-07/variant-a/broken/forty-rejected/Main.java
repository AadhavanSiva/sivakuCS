void main() {
    int attempts = 0;
    int table;
    while (true) {
        IO.println("Enter a table number:");
        String line = IO.readln();
        attempts++;
        try {
            table = Integer.parseInt(line);
        } catch (NumberFormatException e) {
            IO.println("Invalid: not a whole number");
            if (line == null) {
                return;
            }
            continue;
        }
        if (table < 1 || table >= 40) {
            IO.println("Invalid: not from 1 to 40");
            continue;
        }
        break;
    }
    IO.println("Table: " + table);
    IO.println("Attempts: " + attempts);
}
