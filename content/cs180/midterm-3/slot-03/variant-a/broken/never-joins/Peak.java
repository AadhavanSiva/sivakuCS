public class Peak {
    // Starts the threads but never waits for them: the results are read before they are ready.
    public static int highest(Readings readings, int workers) throws InterruptedException {
        int size = readings.size();
        PeakWorker[] jobs = new PeakWorker[workers];
        for (int w = 0; w < workers; w++) {
            jobs[w] = new PeakWorker(readings, w * size / workers, (w + 1) * size / workers);
            new Thread(jobs[w]).start();
        }
        int highest = Integer.MIN_VALUE;
        for (PeakWorker job : jobs) {
            highest = Math.max(highest, job.getPeak());
        }
        return highest;
    }
}
