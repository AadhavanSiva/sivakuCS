// Complete: you do not need to open or change this file.

/** A NumberStore that keeps its number in memory. */
public class MemoryStore implements NumberStore {
    private int value;

    /** @param start the number stored at first */
    public MemoryStore(int start) {
        value = start;
    }

    @Override
    public int get() {
        return value;
    }

    @Override
    public void set(int value) {
        this.value = value;
    }
}
