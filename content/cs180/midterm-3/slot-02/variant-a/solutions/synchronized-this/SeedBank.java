public class SeedBank {
    private Tally tally;

    public SeedBank(Tally tally) {
        this.tally = tally;
    }

    public void add(int n) {
        synchronized (this) {
            int now = tally.get();
            tally.set(now + n);
        }
    }

    public boolean take(int n) {
        boolean ok;
        synchronized (this) {
            int now = tally.get();
            ok = now >= n;
            if (ok) {
                tally.set(now - n);
            }
        }
        return ok;
    }

    public int count() {
        int now;
        synchronized (this) {
            now = tally.get();
        }
        return now;
    }
}
