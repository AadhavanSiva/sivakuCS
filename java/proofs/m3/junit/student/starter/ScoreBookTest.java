import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/** The starter's one passing test: worth 2 points as given. */
class ScoreBookTest {
    @Test
    void addOneScore() {
        ScoreBook book = new ScoreBook();
        book.add(70);
        assertEquals(1, book.count());
    }
}
