/**
 * Hidden: runs the student's methods once on one thread before Run and
 * before each test. In CheerpJ, when several threads first run code whose
 * calls have not been made yet with the classes they now see, one thread
 * can silently die. So this uses exactly the Readings the concurrent tests
 * use (SlowReadings) and no other (java/proofs/m3/threads, README).
 */
public class Warmup {
    public static void warmUp() {
        try {
            SlowReadings readings = new SlowReadings(3, 1);
            PeakWorker worker = new PeakWorker(readings, 0, 2);
            worker.run();
            worker.getPeak();
            Peak.highest(readings, 1);
        } catch (Throwable ignored) {
            // An unfinished class: the tests will say so.
        }
    }
}
