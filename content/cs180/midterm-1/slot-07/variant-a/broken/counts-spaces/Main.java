void main() {
    IO.println("Enter the words:");
    String line = IO.readln();
    String[] words = line.split(" ");

    String reversed = words[words.length - 1];
    for (int i = words.length - 2; i >= 0; i--) {
        reversed = reversed + " " + words[i];
    }
    IO.println("Reversed: " + reversed);
    IO.println("Letters: " + line.length());
}
