import sivaku.harness.Check;

/**
 * Hidden tests for PeakWorker and Peak: the worker alone on given slices,
 * then highest() with different numbers of workers (2 points each), then an
 * instrumented source that checks every index is read exactly once by a
 * worker thread, and that the workers run at the same time (3 points each).
 */
public class Harness {
    private static int peakOf(Readings readings, int lo, int hi) {
        PeakWorker worker = new PeakWorker(readings, lo, hi);
        worker.run();
        return worker.getPeak();
    }

    public static void sampleFromTheHandout() throws InterruptedException {
        Readings readings = new SensorReadings();
        Check.equal("highest(sensor readings, 1)", 31, Peak.highest(readings, 1));
        Check.equal("highest(sensor readings, 4)", 31, Peak.highest(readings, 4));
    }

    public static void workerWholeList() {
        Check.equal("peak of [0, 8)", 31, peakOf(new SensorReadings(), 0, 8));
    }

    public static void workerMiddleSlice() {
        Check.equal("peak of [1, 4) in 5, 2, 8, 6, 40", 8, peakOf(new SlowReadings(5, 2, 8, 6, 40), 1, 4));
    }

    public static void workerOneNegativeReading() {
        Check.equal("peak of [2, 3) in -9, -3, -7, -1", -7, peakOf(new SlowReadings(-9, -3, -7, -1), 2, 3));
    }

    public static void oneWorker() throws InterruptedException {
        Check.equal("highest with 1 worker", 44, Peak.highest(new SlowReadings(7, 44, -2, 19, 3), 1));
    }

    public static void oneWorkerPerReading() throws InterruptedException {
        Check.equal("highest with 6 workers for 6 readings", -5,
                Peak.highest(new SlowReadings(-8, -20, -5, -13, -6, -9), 6));
    }

    public static void unevenSlicesLastIndex() throws InterruptedException {
        Check.equal("highest of 10 readings with 4 workers, largest last", 99,
                Peak.highest(new SlowReadings(4, 8, 1, 9, 3, 7, 2, 6, 5, 99), 4));
    }

    public static void everyIndexOnceByAWorker() throws InterruptedException {
        SlowReadings readings = new SlowReadings(3, 14, 1, 5, 9, 2, 6, 53, 5, 8, 9, 7, 9);
        int highest = Peak.highest(readings, 4);
        Check.equal("highest of 13 readings with 4 workers", 53, highest);
        Check.equal("indexes never read", "[]", readings.skipped().toString());
        Check.equal("indexes read more than once", "[]", readings.readTwice().toString());
        Check.isTrue("the readings were read by threads, not by highest() itself", !readings.readBy(Thread.currentThread()));
        Check.equal("threads that read", 4, readings.threads());
    }

    public static void workersRunTogether() throws InterruptedException {
        SlowReadings readings = new SlowReadings(10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120);
        Peak.highest(readings, 4);
        Check.isTrue("the 4 workers read at the same time (at most " + readings.mostAtOnce() + " were reading at once)",
                readings.mostAtOnce() >= 2);
        Check.isTrue("the readings were read by threads, not by highest() itself", !readings.readBy(Thread.currentThread()));
    }
}
