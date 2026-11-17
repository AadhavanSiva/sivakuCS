import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

public class QuizScoresTest {
    @Test
    public void addOneScore() {
        QuizScores scores = new QuizScoreList();
        assertTrue(scores.add(12));
        assertEquals(1, scores.count());
    }

    @Test
    public void emptyListHasNoHighest() {
        assertEquals(-1, new QuizScoreList().highest());
    }

    @Test
    public void twentyIsAllowed() {
        QuizScores scores = new QuizScoreList();
        assertTrue(scores.add(20));
        assertEquals(20, scores.highest());
    }

    @Test
    public void negativeScoreIsRejected() {
        QuizScores scores = new QuizScoreList();
        assertFalse(scores.add(-1));
        assertEquals(0, scores.count());
    }

    @Test
    public void averageKeepsTheHalf() {
        QuizScores scores = new QuizScoreList();
        scores.add(15);
        scores.add(16);
        assertEquals(15.5, scores.average(), 0.001);
    }
}
