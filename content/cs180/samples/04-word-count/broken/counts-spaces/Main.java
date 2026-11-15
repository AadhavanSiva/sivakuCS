void main() {
    IO.println("Enter a sentence:");
    String[] words = IO.readln().split(" ");
    int letters = 0;
    String longest = "";
    for (String word : words) {
        letters += word.length() + 1;
        if (word.length() > longest.length()) {
            longest = word;
        }
    }
    IO.println("Words: " + words.length);
    IO.println("Letters: " + letters);
    IO.println("Longest: " + longest);
}
