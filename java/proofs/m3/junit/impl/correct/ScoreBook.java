import java.util.ArrayList;
import java.util.List;

/** Scores from 0 to 100. The correct implementation. */
public class ScoreBook {
    private final List<Integer> scores = new ArrayList<>();

    /** @throws IllegalArgumentException if score is below 0 or above 100 */
    public void add(int score) {
        if (score < 0 || score > 100) {
            throw new IllegalArgumentException("score out of range: " + score);
        }
        scores.add(score);
    }

    public int count() {
        return scores.size();
    }

    /** @return the highest score, or -1 if there are none */
    public int max() {
        int max = -1;
        for (int s : scores) {
            max = Math.max(max, s);
        }
        return max;
    }

    /** @return the average score, or 0.0 if there are none */
    public double average() {
        if (scores.isEmpty()) {
            return 0.0;
        }
        int sum = 0;
        for (int s : scores) {
            sum += s;
        }
        return (double) sum / scores.size();
    }
}
