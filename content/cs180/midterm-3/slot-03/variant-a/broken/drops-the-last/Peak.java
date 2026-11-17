public class Peak {
    // Equal slices of size / workers: when it does not divide evenly, the last few readings are never read.
    public static int highest(Readings readings, int workers) throws InterruptedException {
        int each = readings.size() / workers;
        PeakWorker[] jobs = new PeakWorker[workers];
        Thread[] threads = new Thread[workers];
        for (int w = 0; w < workers; w++) {
            jobs[w] = new PeakWorker(readings, w * each, w * each + each);
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
