public class Peak {
    /**
     * The largest reading, found by `workers` threads at once, each searching its own slice.
     *
     * @param readings the readings; at least one
     * @param workers how many threads to use, from 1 to readings.size()
     * @return the largest reading
     */
    public static int highest(Readings readings, int workers) throws InterruptedException {
        int size = readings.size();
        PeakWorker[] jobs = new PeakWorker[workers];
        Thread[] threads = new Thread[workers];
        for (int w = 0; w < workers; w++) {
            jobs[w] = new PeakWorker(readings, w * size / workers, (w + 1) * size / workers);
            threads[w] = new Thread(jobs[w]);
            threads[w].start();
        }
        int highest = Integer.MIN_VALUE;
        for (int w = 0; w < workers; w++) {
            threads[w].join();
            highest = Math.max(highest, jobs[w].getPeak());
        }
        return highest;
    }
}
