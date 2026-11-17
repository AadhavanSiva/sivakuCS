import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

public class QuizScoresTest {
    @Test
    public void addOneScore() {
        QuizScores scores = new QuizScoreList();
        assertTrue(scores.add(12));
        assertEquals(1, scores.count());
    }
}
