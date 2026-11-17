/** Seed packets held in a slow, shared Tally. */
public class SeedBank {

    /** Creates a seed bank that keeps its count in the given tally. */
    public SeedBank(Tally tally) {
    }

    /** Adds n packets. */
    public void add(int n) {
    }

    /**
     * Removes n packets if at least n are held; otherwise changes nothing.
     *
     * @return whether the packets were removed
     */
    public boolean take(int n) {
        return false;
    }

    /** @return the number of packets held */
    public int count() {
        return 0;
    }
}
