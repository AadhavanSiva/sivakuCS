void main() {
    IO.println("Enter your age:");
    int age = Integer.parseInt(IO.readln().trim());
    IO.println("Are you a student? (y/n)");
    String answer = IO.readln().trim();

    double price;
    if (age < 12) {
        price = 6.50;
    } else if (age > 65) {
        price = 7.25;
    } else if (answer.equalsIgnoreCase("y")) {
        price = 8.75;
    } else {
        price = 11.00;
    }
    IO.println(String.format("Ticket price: $%.2f", price));
}
