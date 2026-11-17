/** Finds the largest reading in one slice of the readings. */
public class PeakWorker implements Runnable {

    /**
     * @param readings the readings to search
     * @param lo the first index of the slice
     * @param hi one past the last index of the slice; the slice has at least one reading
     */
    public PeakWorker(Readings readings, int lo, int hi) {
    }

    /** Searches the slice. */
    @Override
    public void run() {
    }

    /** @return the largest reading in the slice, once run() has finished */
    public int getPeak() {
        return 0;
    }
}
