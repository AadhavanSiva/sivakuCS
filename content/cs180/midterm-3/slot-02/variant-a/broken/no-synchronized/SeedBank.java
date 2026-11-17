public class SeedBank {
    private final Tally tally;

    public SeedBank(Tally tally) {
        this.tally = tally;
    }

    public void add(int n) {
        tally.set(tally.get() + n);
    }

    public boolean take(int n) {
        int held = tally.get();
        if (held < n) {
            return false;
        }
        tally.set(held - n);
        return true;
    }

    public int count() {
        return tally.get();
    }
}
