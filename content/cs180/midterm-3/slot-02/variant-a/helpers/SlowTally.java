/**
 * Hidden: a Tally as slow as the question says, so threads always
 * interleave between a read and the write after it. Records the lowest
 * value ever stored, to catch a count that went below zero.
 */
public class SlowTally implements Tally {
    private volatile int value;
    private int lowest;

    public SlowTally(int start) {
        value = start;
        lowest = start;
    }

    private static void pause() {
        try {
            Thread.sleep(2);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Override
    public int get() {
        int v = value;
        pause();
        return v;
    }

    @Override
    public void set(int v) {
        pause();
        value = v;
        synchronized (this) {
            lowest = Math.min(lowest, v);
        }
    }

    /** The value now, without the delay. */
    public int peek() {
        return value;
    }

    public synchronized int lowest() {
        return lowest;
    }
}
