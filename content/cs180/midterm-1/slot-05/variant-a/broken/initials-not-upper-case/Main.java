void main() {
    IO.println("Enter your full name:");
    String[] parts = IO.readln().split(" ");
    String first = parts[0];
    String last = parts[1];

    String initials = "" + first.charAt(0) + last.charAt(0);
    String code = first.substring(first.length() - 2).toUpperCase()
            + last.substring(0, 2).toLowerCase()
            + (first.length() + last.length());
    IO.println("Initials: " + initials);
    IO.println("Member code: " + code);
}
