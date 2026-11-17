public class Peak {
    // Calls run() instead of start(): every slice is searched by the calling thread, one after another.
    public static int highest(Readings readings, int workers) throws InterruptedException {
        int size = readings.size();
        PeakWorker[] jobs = new PeakWorker[workers];
        Thread[] threads = new Thread[workers];
        for (int w = 0; w < workers; w++) {
            jobs[w] = new PeakWorker(readings, w * size / workers, (w + 1) * size / workers);
            threads[w] = new Thread(jobs[w]);
            threads[w].run();
        }
        int highest = Integer.MIN_VALUE;
        for (int w = 0; w < workers; w++) {
            threads[w].join();
            highest = Math.max(highest, jobs[w].getPeak());
        }
        return highest;
    }
}
