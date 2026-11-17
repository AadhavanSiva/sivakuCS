import java.util.ArrayList;
import java.util.List;

/** Bug (a computed value): the average is a whole-number division. */
public class QuizScoreList implements QuizScores {
    private final List<Integer> scores = new ArrayList<>();

    @Override
    public boolean add(int score) {
        if (score < 0 || score > 20) {
            return false;
        }
        scores.add(score);
        return true;
    }

    @Override
    public int count() {
        return scores.size();
    }

    @Override
    public int highest() {
        int highest = -1;
        for (int s : scores) {
            highest = Math.max(highest, s);
        }
        return highest;
    }

    @Override
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
