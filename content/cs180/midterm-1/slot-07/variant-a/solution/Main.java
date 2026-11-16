void main() {
    IO.println("Enter the words:");
    String[] words = IO.readln().split(" ");

    String reversed = words[words.length - 1];
    int letters = words[words.length - 1].length();
    for (int i = words.length - 2; i >= 0; i--) {
        reversed = reversed + " " + words[i];
        letters += words[i].length();
    }
    IO.println("Reversed: " + reversed);
    IO.println("Letters: " + letters);
}
