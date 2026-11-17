/** Seed packets held in a slow, shared Tally. */
public class SeedBank {
    private final Tally tally;

    /** Creates a seed bank that keeps its count in the given tally. */
    public SeedBank(Tally tally) {
        this.tally = tally;
    }

    /** Adds n packets. */
    public synchronized void add(int n) {
        tally.set(tally.get() + n);
    }

    /**
     * Removes n packets if at least n are held; otherwise changes nothing.
     *
     * @return whether the packets were removed
     */
    public synchronized boolean take(int n) {
        int held = tally.get();
        if (held < n) {
            return false;
        }
        tally.set(held - n);
        return true;
    }

    /** @return the number of packets held */
    public synchronized int count() {
        return tally.get();
    }
}
