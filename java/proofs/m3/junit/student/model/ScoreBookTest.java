import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

/** A model student suite: should catch all four bugs (14 points). */
class ScoreBookTest {
    @Test
    void addOneScore() {
        ScoreBook book = new ScoreBook();
        book.add(70);
        assertEquals(1, book.count());
    }

    @Test
    void emptyBookHasNoMax() {
        assertEquals(-1, new ScoreBook().max());
    }

    @Test
    void acceptsTheTopScore() {
        ScoreBook book = new ScoreBook();
        book.add(100);
        assertEquals(100, book.max());
    }

    @Test
    void rejectsANegativeScore() {
        assertThrows(IllegalArgumentException.class, () -> new ScoreBook().add(-5));
    }

    @Test
    void averageKeepsTheHalf() {
        ScoreBook book = new ScoreBook();
        book.add(90);
        book.add(85);
        assertEquals(87.5, book.average(), 1e-9);
    }
}
