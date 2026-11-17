// Complete: you do not need to open or change this file.

/** A read-only list of whole numbers. Slow: each get takes a few milliseconds. */
public interface Readings {
    /** @return how many readings there are */
    int size();

    /** @return the reading at index i, from 0 to size() - 1 */
    int get(int i);
}
