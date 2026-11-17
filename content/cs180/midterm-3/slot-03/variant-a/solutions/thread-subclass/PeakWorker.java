/** A worker that is its own thread. */
public class PeakWorker extends Thread {
    private final Readings readings;
    private final int lo;
    private final int hi;
    private int peak = Integer.MIN_VALUE;

    public PeakWorker(Readings readings, int lo, int hi) {
        this.readings = readings;
        this.lo = lo;
        this.hi = hi;
    }

    @Override
    public void run() {
        for (int i = lo; i < hi; i++) {
            int r = readings.get(i);
            if (r > peak) {
                peak = r;
            }
        }
    }

    public int getPeak() {
        return peak;
    }
}
