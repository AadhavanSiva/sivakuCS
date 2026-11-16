void main() {
    int attempts = 0;
    int table = 0;
    while (true) {
        IO.println("Enter a table number:");
        String line = IO.readln();
        attempts++;
        try {
            table = Integer.parseInt(line);
            if (table >= 1 && table <= 40) {
                break;
            }
        } catch (NumberFormatException e) {
            // handled below
        }
        IO.println("Invalid: not a whole number");
    }
    IO.println("Table: " + table);
    IO.println("Attempts: " + attempts);
}
