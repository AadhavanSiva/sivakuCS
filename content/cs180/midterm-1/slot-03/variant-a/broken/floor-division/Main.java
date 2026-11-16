void main() {
    IO.println("Enter the dividend:");
    int dividend = Integer.parseInt(IO.readln().trim());
    IO.println("Enter the divisor:");
    int divisor = Integer.parseInt(IO.readln().trim());

    if (divisor == 0) {
        IO.println("Division by zero is undefined.");
        return;
    }
    if (Math.floorMod(dividend, divisor) == 0) {
        IO.println("Divisible: yes");
    } else {
        IO.println("Divisible: no");
    }
    IO.println("Quotient: " + Math.floorDiv(dividend, divisor));
    IO.println("Remainder: " + Math.floorMod(dividend, divisor));
}
