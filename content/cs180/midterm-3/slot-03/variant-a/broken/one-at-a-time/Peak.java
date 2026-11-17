public class Peak {
    // Starts each thread and waits for it before starting the next: they never run together.
    public static int highest(Readings readings, int workers) throws InterruptedException {
        int size = readings.size();
        int highest = Integer.MIN_VALUE;
        for (int w = 0; w < workers; w++) {
            PeakWorker job = new PeakWorker(readings, w * size / workers, (w + 1) * size / workers);
            Thread t = new Thread(job);
            t.start();
            t.join();
            highest = Math.max(highest, job.getPeak());
        }
        return highest;
    }
}
