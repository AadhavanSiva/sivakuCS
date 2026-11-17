import java.util.ArrayList;

/** Workers and threads kept in lists; the first slices take one extra reading each. */
public class Peak {
    public static int highest(Readings readings, int workers) throws InterruptedException {
        ArrayList<PeakWorker> jobs = new ArrayList<>();
        ArrayList<Thread> threads = new ArrayList<>();
        int base = readings.size() / workers;
        int extra = readings.size() % workers;
        int lo = 0;
        for (int w = 0; w < workers; w++) {
            int hi = lo + base + (w < extra ? 1 : 0);
            PeakWorker job = new PeakWorker(readings, lo, hi);
            jobs.add(job);
            threads.add(new Thread(job));
            lo = hi;
        }
        for (Thread t : threads) {
            t.start();
        }
        for (Thread t : threads) {
            t.join();
        }
        int best = Integer.MIN_VALUE;
        for (PeakWorker job : jobs) {
            if (job.getPeak() > best) {
                best = job.getPeak();
            }
        }
        return best;
    }
}
