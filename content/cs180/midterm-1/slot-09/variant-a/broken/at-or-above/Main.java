void main() {
    IO.println("How many scores?");
    int n = Integer.parseInt(IO.readln().trim());
    int[] scores = new int[n];
    for (int i = 0; i < n; i++) {
        IO.println("Enter a score:");
        scores[i] = Integer.parseInt(IO.readln().trim());
    }

    int best = 0;
    int sum = 0;
    for (int i = 0; i < n; i++) {
        if (scores[i] > scores[best]) {
            best = i;
        }
        sum += scores[i];
    }
    double average = (double) sum / n;

    int above = 0;
    for (int i = 0; i < n; i++) {
        if (scores[i] >= average) {
            above++;
        }
    }
    IO.println("Best index: " + best);
    IO.println(String.format("Average: %.2f", average));
    IO.println("Above average: " + above);
}
