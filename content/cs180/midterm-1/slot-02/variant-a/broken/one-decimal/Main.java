void main() {
    IO.println("Visitors on Saturday:");
    int saturday = Integer.parseInt(IO.readln().trim());
    IO.println("Visitors on Sunday:");
    int sunday = Integer.parseInt(IO.readln().trim());

    int total = saturday + sunday;
    double average = total / 2.0;
    IO.println("Total visitors: " + total);
    IO.println("Average per day: " + average);
}
