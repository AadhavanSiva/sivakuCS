// Complete: you do not need to open or change this file.

/**
 * The scores from one quiz. A score is a whole number from 0 to 20, both
 * included. The class you are testing, QuizScoreList, implements this
 * interface and has a constructor with no arguments that makes an empty list.
 */
public interface QuizScores {
    /**
     * Adds a score if it is from 0 to 20, both included, and returns true.
     * Any other score is not added: nothing changes and it returns false.
     */
    boolean add(int score);

    /** @return how many scores have been added */
    int count();

    /** @return the highest score added, or -1 if none have been */
    int highest();

    /** @return the average of the scores added, or 0.0 if none have been */
    double average();
}
