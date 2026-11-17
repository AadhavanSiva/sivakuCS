public class PeakWorker implements Runnable {
    private Readings readings;
    private int lo;
    private int hi;
    private int peak;

    public PeakWorker(Readings readings, int lo, int hi) {
        this.readings = readings;
        this.lo = lo;
        this.hi = hi;
    }

    public void run() {
        int best = readings.get(lo);
        for (int i = lo + 1; i < hi; i++) {
            best = Math.max(best, readings.get(i));
        }
        peak = best;
    }

    public int getPeak() {
        return peak;
    }
}
