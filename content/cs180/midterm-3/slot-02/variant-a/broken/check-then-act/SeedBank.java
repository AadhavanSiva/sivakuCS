public class SeedBank {
    private final Tally tally;

    public SeedBank(Tally tally) {
        this.tally = tally;
    }

    public synchronized void add(int n) {
        tally.set(tally.get() + n);
    }

    // Each step is synchronized, but another thread can take in between them.
    public boolean take(int n) {
        if (count() < n) {
            return false;
        }
        remove(n);
        return true;
    }

    private synchronized void remove(int n) {
        tally.set(tally.get() - n);
    }

    public synchronized int count() {
        return tally.get();
    }
}
