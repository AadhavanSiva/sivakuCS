// Complete: you do not need to open or change this file.

/** A Tally that keeps its number in memory. */
public class MemoryTally implements Tally {
    private int value;

    @Override
    public int get() {
        return value;
    }

    @Override
    public void set(int value) {
        this.value = value;
    }
}
