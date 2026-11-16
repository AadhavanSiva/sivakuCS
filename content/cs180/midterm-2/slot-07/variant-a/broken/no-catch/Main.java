void main() {
    int attempts = 0;
    int table;
    while (true) {
        IO.println("Enter a table number:");
        table = Integer.parseInt(IO.readln());
        attempts++;
        if (table < 1 || table > 40) {
            IO.println("Invalid: not from 1 to 40");
            continue;
        }
        break;
    }
    IO.println("Table: " + table);
    IO.println("Attempts: " + attempts);
}
