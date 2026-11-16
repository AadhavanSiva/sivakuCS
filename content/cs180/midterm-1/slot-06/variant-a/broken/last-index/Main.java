void main() {
    IO.println("Enter the banner text:");
    String text = IO.readln().toLowerCase();
    IO.println("Enter a character:");
    char target = IO.readln().toLowerCase().charAt(0);

    int count = 0;
    int first = -1;
    for (int i = 0; i < text.length(); i++) {
        if (text.charAt(i) == target) {
            count++;
            first = i;
        }
    }
    IO.println("Count: " + count);
    IO.println("First index: " + first);
}
