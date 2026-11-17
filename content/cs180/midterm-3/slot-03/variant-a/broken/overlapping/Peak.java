public class Peak {
    // Each slice runs one past its end, so neighbouring threads both read the boundary.
    public static int highest(Readings readings, int workers) throws InterruptedException {
        int size = readings.size();
        PeakWorker[] jobs = new PeakWorker[workers];
        Thread[] threads = new Thread[workers];
        for (int w = 0; w < workers; w++) {
            int hi = Math.min(size, (w + 1) * size / workers + 1);
            jobs[w] = new PeakWorker(readings, w * size / workers, hi);
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
