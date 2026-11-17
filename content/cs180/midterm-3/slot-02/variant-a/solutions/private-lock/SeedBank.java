/** Seed packets held in a slow, shared Tally. */
public class SeedBank {
    private final Tally tally;
    private final Object lock = new Object();

    public SeedBank(Tally tally) {
        this.tally = tally;
    }

    public void add(int n) {
        synchronized (lock) {
            tally.set(tally.get() + n);
        }
    }

    public boolean take(int n) {
        synchronized (lock) {
            int held = tally.get();
            if (held >= n) {
                tally.set(held - n);
                return true;
            }
        }
        return false;
    }

    public int count() {
        synchronized (lock) {
            return tally.get();
        }
    }
}
