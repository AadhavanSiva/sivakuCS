import java.util.ArrayList;
import java.util.List;

/** Bug (a computed value): the average uses whole-number division. */
public class ScoreBook {
    private final List<Integer> scores = new ArrayList<>();

    public void add(int score) {
        if (score < 0 || score > 100) {
            throw new IllegalArgumentException("score out of range: " + score);
        }
        scores.add(score);
    }

    public int count() {
        return scores.size();
    }

    public int max() {
        int max = -1;
        for (int s : scores) {
            max = Math.max(max, s);
        }
        return max;
    }

    public double average() {
        if (scores.isEmpty()) {
            return 0.0;
        }
        int sum = 0;
        for (int s : scores) {
            sum += s;
        }
        return sum / scores.size();
    }
}
