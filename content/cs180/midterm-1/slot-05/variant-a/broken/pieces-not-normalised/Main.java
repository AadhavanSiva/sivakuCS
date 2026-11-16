void main() {
    IO.println("Enter your full name:");
    String[] parts = IO.readln().split(" ");
    String first = parts[0];
    String last = parts[1];

    String initials = first.substring(0, 1).toUpperCase() + last.substring(0, 1).toUpperCase();
    String code = first.substring(first.length() - 2)
            + last.substring(0, 2)
            + (first.length() + last.length());
    IO.println("Initials: " + initials);
    IO.println("Member code: " + code);
}
