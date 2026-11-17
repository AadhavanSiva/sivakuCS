// Complete: you do not need to open or change this file.

/** Stores one whole number. Slow, like a real device: each get and set takes a moment. */
public interface NumberStore {
    /** @return the number stored */
    int get();

    /** Stores a new number. */
    void set(int value);
}
