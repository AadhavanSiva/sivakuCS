/**
 * Hidden: a NumberStore as slow as the question says, so threads always
 * interleave between a read and the write after it.
 */
public class SlowStore implements NumberStore {
    private volatile int value;

    public SlowStore(int start) {
        value = start;
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
    }

    /** The number now, without the delay. */
    public int peek() {
        return value;
    }
}
