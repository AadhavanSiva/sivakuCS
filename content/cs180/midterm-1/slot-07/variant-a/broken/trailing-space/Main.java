void main() {
    IO.println("Enter the words:");
    String[] words = IO.readln().split(" ");

    String reversed = "";
    int letters = 0;
    for (int i = words.length - 1; i >= 0; i--) {
        reversed = reversed + words[i] + " ";
        letters += words[i].length();
    }
    IO.println("Reversed: " + reversed);
    IO.println("Letters: " + letters);
}
