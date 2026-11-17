public class SeedBank {
    private final Tally tally;

    public SeedBank(Tally tally) {
        this.tally = tally;
    }

    public void add(int n) {
        synchronized (tally) {
            tally.set(tally.get() + n);
        }
    }

    public boolean take(int n) {
        synchronized (tally) {
            if (tally.get() < n) {
                return false;
            }
            tally.set(tally.get() - n);
            return true;
        }
    }

    public int count() {
        synchronized (tally) {
            return tally.get();
        }
    }
}
