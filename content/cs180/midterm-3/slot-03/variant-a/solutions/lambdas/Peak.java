/** Threads made from lambdas; each slice's result lands in an array slot. */
public class Peak {
    public static int highest(Readings readings, int workers) throws InterruptedException {
        int[] peaks = new int[workers];
        Thread[] threads = new Thread[workers];
        int size = readings.size();
        for (int w = 0; w < workers; w++) {
            int slot = w;
            int lo = w * size / workers;
            int hi = (w + 1) * size / workers;
            threads[w] = new Thread(() -> {
                PeakWorker worker = new PeakWorker(readings, lo, hi);
                worker.run();
                peaks[slot] = worker.getPeak();
            });
        }
        for (Thread t : threads) {
            t.start();
        }
        for (Thread t : threads) {
            t.join();
        }
        int best = peaks[0];
        for (int p : peaks) {
            best = Math.max(best, p);
        }
        return best;
    }
}
