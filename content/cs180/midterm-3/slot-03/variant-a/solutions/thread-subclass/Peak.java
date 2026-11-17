public class Peak {
    public static int highest(Readings readings, int workers) throws InterruptedException {
        PeakWorker[] all = new PeakWorker[workers];
        int size = readings.size();
        for (int w = 0; w < workers; w++) {
            all[w] = new PeakWorker(readings, w * size / workers, (w + 1) * size / workers);
            all[w].start();
        }
        int best = Integer.MIN_VALUE;
        for (PeakWorker worker : all) {
            worker.join();
            best = Math.max(best, worker.getPeak());
        }
        return best;
    }
}
