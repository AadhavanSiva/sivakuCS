/** A private lock, with take() and add() calling count() while they hold it. */
public class SeedBank {
    private final Tally tally;
    private final Object lock = new Object();

    public SeedBank(Tally tally) {
        this.tally = tally;
    }

    public void add(int n) {
        synchronized (lock) {
            tally.set(count() + n);
        }
    }

    public boolean take(int n) {
        synchronized (lock) {
            int held = count();
            if (held < n) {
                return false;
            }
            tally.set(held - n);
            return true;
        }
    }

    public int count() {
        synchronized (lock) {
            return tally.get();
        }
    }
}
