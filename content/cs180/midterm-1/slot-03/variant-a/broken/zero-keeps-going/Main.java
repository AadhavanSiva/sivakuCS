void main() {
    IO.println("Enter the dividend:");
    int dividend = Integer.parseInt(IO.readln().trim());
    IO.println("Enter the divisor:");
    int divisor = Integer.parseInt(IO.readln().trim());

    if (divisor == 0) {
        IO.println("Division by zero is undefined.");
        IO.println("Quotient: undefined");
        IO.println("Remainder: undefined");
    } else {
        if (dividend % divisor == 0) {
            IO.println("Divisible: yes");
        } else {
            IO.println("Divisible: no");
        }
        IO.println("Quotient: " + dividend / divisor);
        IO.println("Remainder: " + dividend % divisor);
    }
}
