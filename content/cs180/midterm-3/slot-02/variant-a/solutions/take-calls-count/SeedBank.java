/** Synchronized methods that call each other: a thread holding the lock can take it again. */
public class SeedBank {
    private final Tally tally;

    public SeedBank(Tally tally) {
        this.tally = tally;
    }

    public synchronized void add(int n) {
        tally.set(count() + n);
    }

    public synchronized boolean take(int n) {
        if (count() < n) {
            return false;
        }
        tally.set(count() - n);
        return true;
    }

    public synchronized int count() {
        return tally.get();
    }
}
