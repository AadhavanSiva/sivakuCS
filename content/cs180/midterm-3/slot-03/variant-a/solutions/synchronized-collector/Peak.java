/** Each thread hands its slice's peak to a shared collector with a synchronized method. */
public class Peak {
    private static class Collector {
        private int best = Integer.MIN_VALUE;

        synchronized void offer(int peak) {
            if (peak > best) {
                best = peak;
            }
        }

        synchronized int best() {
            return best;
        }
    }

    public static int highest(Readings readings, int workers) throws InterruptedException {
        Collector collector = new Collector();
        Thread[] threads = new Thread[workers];
        int size = readings.size();
        for (int w = 0; w < workers; w++) {
            PeakWorker job = new PeakWorker(readings, w * size / workers, (w + 1) * size / workers);
            threads[w] = new Thread(() -> {
                job.run();
                collector.offer(job.getPeak());
            });
            threads[w].start();
        }
        for (Thread t : threads) {
            t.join();
        }
        return collector.best();
    }
}
