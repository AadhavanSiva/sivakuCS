/** Finds the largest reading in one slice of the readings. */
public class PeakWorker implements Runnable {
    private final Readings readings;
    private final int lo;
    private final int hi;
    private int peak;

    /**
     * @param readings the readings to search
     * @param lo the first index of the slice
     * @param hi one past the last index of the slice; the slice has at least one reading
     */
    public PeakWorker(Readings readings, int lo, int hi) {
        this.readings = readings;
        this.lo = lo;
        this.hi = hi;
    }

    /** Searches the slice. */
    @Override
    public void run() {
        peak = readings.get(lo);
        for (int i = lo + 1; i < hi; i++) {
            peak = Math.max(peak, readings.get(i));
        }
    }

    /** @return the largest reading in the slice, once run() has finished */
    public int getPeak() {
        return peak;
    }
}
