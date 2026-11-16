import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Midterm 3 proof 1 (cs180-exam-specs section 8): can thread questions be
 * graded reliably? Prints one JSON object on standard output.
 *
 * <p>Read-modify-write (topics B and G): a store that is "slow like a real
 * device" sleeps between a read and the write that follows, so threads
 * always interleave there. An unsynchronised counter must then lose updates
 * in every one of 20 runs, and a synchronised one must never lose any.
 *
 * <p>Parallel split (topic A): an instrumented source records which thread
 * read each index, how many threads were reading at once, and when each
 * thread started and finished, so a grader can tell parallel from serial,
 * and spot skipped and doubly read indexes.
 */
public class ThreadsProof {
    static final int RUNS = 20;

    // ---- read-modify-write -------------------------------------------------

    interface Store {
        int get();

        void set(int value);
    }

    static void pause() {
        try {
            Thread.sleep(1);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    /** Slow like a real device: every read and write takes a millisecond. */
    static final class SlowStore implements Store {
        private int value;

        SlowStore(int value) {
            this.value = value;
        }

        public int get() {
            int v = value;
            pause();
            return v;
        }

        public void set(int v) {
            pause();
            value = v;
        }
    }

    interface Stock {
        void add(int n);

        boolean take(int n);
    }

    /** What a student who forgets synchronized writes. */
    static final class Unsynchronised implements Stock {
        private final Store store;

        Unsynchronised(Store store) {
            this.store = store;
        }

        public void add(int n) {
            store.set(store.get() + n);
        }

        public boolean take(int n) {
            int have = store.get();
            if (have < n) {
                return false;
            }
            store.set(have - n);
            return true;
        }
    }

    static final class Synchronised implements Stock {
        private final Store store;

        Synchronised(Store store) {
            this.store = store;
        }

        public synchronized void add(int n) {
            store.set(store.get() + n);
        }

        public synchronized boolean take(int n) {
            int have = store.get();
            if (have < n) {
                return false;
            }
            store.set(have - n);
            return true;
        }
    }

    interface StockMaker {
        Stock make(Store store);
    }

    static void runAll(List<Thread> threads) throws InterruptedException {
        for (Thread t : threads) {
            t.start();
        }
        for (Thread t : threads) {
            t.join();
        }
    }

    /** What threads threw, with where: CheerpJ's own failures show up here. */
    static final List<String> THROWN = new ArrayList<>();

    static void recordThrown(Throwable t) {
        StringBuilder s = new StringBuilder(Thread.currentThread().getName() + ": " + t);
        StackTraceElement[] frames = t.getStackTrace();
        for (int i = 0; i < Math.min(12, frames.length); i++) {
            s.append(i == 0 ? " at " : " / ").append(frames[i]);
        }
        if (frames.length == 0) {
            s.append(" (no stack trace)");
        }
        synchronized (THROWN) {
            THROWN.add(s.toString());
        }
    }

    /** 8 threads each add 1 ten times: the store must end at 80. */
    static int addRun(StockMaker maker) throws InterruptedException {
        SlowStore store = new SlowStore(0);
        Stock stock = maker.make(store);
        List<Thread> threads = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            threads.add(new Thread(() -> {
                try {
                    for (int i = 0; i < 10; i++) {
                        stock.add(1);
                    }
                } catch (Throwable e) {
                    recordThrown(e);
                }
            }));
        }
        runAll(threads);
        return store.get();
    }

    /** 12 threads race to take 1 from a stock of 5: exactly 5 may succeed. */
    static int takeRun(StockMaker maker) throws InterruptedException {
        SlowStore store = new SlowStore(5);
        Stock stock = maker.make(store);
        AtomicInteger succeeded = new AtomicInteger();
        List<Thread> threads = new ArrayList<>();
        for (int t = 0; t < 12; t++) {
            threads.add(new Thread(() -> {
                if (stock.take(1)) {
                    succeeded.incrementAndGet();
                }
            }));
        }
        runAll(threads);
        return succeeded.get();
    }

    // ---- does join() wait? ---------------------------------------------------

    /**
     * Starts 8 threads that each sleep a little and then mark themselves
     * finished, joins them all, and counts the threads whose join returned
     * before they had finished; also reports their state at that moment.
     */
    static String joinCheck(int runs) throws InterruptedException {
        int early = 0;
        int earlyRuns = 0;
        List<String> states = new ArrayList<>();
        for (int run = 0; run < runs; run++) {
            boolean[] finished = new boolean[8];
            List<Thread> threads = new ArrayList<>();
            for (int t = 0; t < 8; t++) {
                int me = t;
                threads.add(new Thread(() -> {
                    for (int i = 0; i < 5; i++) {
                        pause();
                    }
                    synchronized (finished) {
                        finished[me] = true;
                    }
                }));
            }
            runAll(threads);
            int earlyHere = 0;
            synchronized (finished) {
                for (int t = 0; t < 8; t++) {
                    if (!finished[t]) {
                        earlyHere++;
                        if (states.size() < 10) {
                            states.add("run " + run + " thread " + t + ": " + threads.get(t).getState()
                                    + (threads.get(t).isAlive() ? " alive" : " not alive"));
                        }
                    }
                }
            }
            early += earlyHere;
            earlyRuns += earlyHere > 0 ? 1 : 0;
            // Let any thread join() abandoned finish before the next run.
            for (Thread t : threads) {
                while (t.getState() != Thread.State.TERMINATED) {
                    pause();
                }
            }
        }
        List<String> quoted = new ArrayList<>();
        for (String s : states) {
            quoted.add(json(s));
        }
        return "{\"runs\":" + runs + ",\"runsWithAnEarlyJoin\":" + earlyRuns + ",\"threadsJoinedEarly\":" + early
                + ",\"examples\":[" + String.join(",", quoted) + "]}";
    }

    // ---- parallel split ----------------------------------------------------

    /** A slow, read-only source that records who read what, and when. */
    static final class InstrumentedSource {
        private final int[] values;
        private final List<List<String>> readers = new ArrayList<>();
        private final AtomicInteger active = new AtomicInteger();
        private int mostAtOnce;
        private final List<String> threadNames = new ArrayList<>();
        private final List<long[]> spans = new ArrayList<>();

        InstrumentedSource(int size) {
            values = new int[size];
            for (int i = 0; i < size; i++) {
                values[i] = (i * 37) % 101;
                readers.add(new ArrayList<>());
            }
        }

        int size() {
            return values.length;
        }

        int get(int i) {
            int now = active.incrementAndGet();
            long at = System.nanoTime();
            String name = Thread.currentThread().getName();
            synchronized (this) {
                mostAtOnce = Math.max(mostAtOnce, now);
                readers.get(i).add(name);
                int k = threadNames.indexOf(name);
                if (k < 0) {
                    threadNames.add(name);
                    spans.add(new long[] {at, at});
                } else {
                    spans.get(k)[1] = at;
                }
            }
            pause();
            active.decrementAndGet();
            return values[i];
        }

        /** Whether some two threads were reading during overlapping spans of time. */
        synchronized boolean overlapped() {
            for (int a = 0; a < spans.size(); a++) {
                for (int b = a + 1; b < spans.size(); b++) {
                    if (spans.get(a)[0] <= spans.get(b)[1] && spans.get(b)[0] <= spans.get(a)[1]) {
                        return true;
                    }
                }
            }
            return false;
        }

        synchronized String report() {
            List<Integer> skipped = new ArrayList<>();
            List<Integer> readTwice = new ArrayList<>();
            StringBuilder byIndex = new StringBuilder("[");
            for (int i = 0; i < values.length; i++) {
                List<String> r = readers.get(i);
                if (r.isEmpty()) {
                    skipped.add(i);
                }
                if (r.size() > 1) {
                    readTwice.add(i);
                }
                byIndex.append(i == 0 ? "" : ",").append(r.isEmpty() ? "null" : json(r.get(0)));
            }
            byIndex.append("]");
            return "{\"threads\":" + threadNames.size() + ",\"mostAtOnce\":" + mostAtOnce
                    + ",\"overlapped\":" + overlapped() + ",\"skipped\":" + skipped + ",\"readTwice\":" + readTwice
                    + ",\"readerOfIndex\":" + byIndex + "}";
        }
    }

    /** A worker as students write it: the largest value in [lo, hi). */
    static final class MaxWorker implements Runnable {
        private final InstrumentedSource source;
        private final int lo;
        private final int hi;
        int max = Integer.MIN_VALUE;

        MaxWorker(InstrumentedSource source, int lo, int hi) {
            this.source = source;
            this.lo = lo;
            this.hi = hi;
        }

        public void run() {
            for (int i = lo; i < hi; i++) {
                max = Math.max(max, source.get(i));
            }
        }
    }

    enum Split { PARALLEL, ONE_AFTER_ANOTHER, OVERLAPPING, SKIPS_ONE }

    /** Splits the source into slices, one thread each, in one of the ways students write it. */
    static int largest(InstrumentedSource source, int workers, Split split) throws InterruptedException {
        int size = source.size();
        List<MaxWorker> jobs = new ArrayList<>();
        List<Thread> threads = new ArrayList<>();
        for (int w = 0; w < workers; w++) {
            int lo = w * size / workers;
            int hi = (w + 1) * size / workers;
            if (split == Split.OVERLAPPING && w < workers - 1) {
                hi++;
            }
            if (split == Split.SKIPS_ONE && w > 0) {
                lo++;
            }
            MaxWorker job = new MaxWorker(source, lo, hi);
            jobs.add(job);
            threads.add(new Thread(job, "worker-" + w));
        }
        if (split == Split.ONE_AFTER_ANOTHER) {
            for (Thread t : threads) {
                t.start();
                t.join();
            }
        } else {
            runAll(threads);
        }
        int max = Integer.MIN_VALUE;
        for (MaxWorker job : jobs) {
            max = Math.max(max, job.max);
        }
        return max;
    }

    // ---- main -------------------------------------------------------------

    public static void main(String[] args) throws Exception {
        StringBuilder out = new StringBuilder("{");
        // First, in a JVM that has not run threads yet: does join() wait for every thread?
        long joinStart = System.nanoTime();
        out.append("\"join\":").append(joinCheck(RUNS))
                .append(",\"joinMs\":").append((System.nanoTime() - joinStart) / 1_000_000).append(",");

        int unsyncAddFailures = 0;
        int syncAddFailures = 0;
        int unsyncTakeFailures = 0;
        int syncTakeFailures = 0;
        // CheerpJ can fail inside its own code when several threads first run
        // a path at once; a grader can run the student's methods once on one
        // thread first. "warm" on standard input does that here.
        boolean warm = new String(System.in.readAllBytes()).trim().equals("warm");
        if (warm) {
            for (StockMaker maker : new StockMaker[] {Unsynchronised::new, Synchronised::new}) {
                Stock stock = maker.make(new SlowStore(1));
                stock.add(1);
                stock.take(1);
                stock.take(5);
            }
        }
        out.append("\"warmedUp\":").append(warm).append(",");
        List<Integer> unsyncTotals = new ArrayList<>();
        List<Integer> syncTotals = new ArrayList<>();
        List<Integer> unsyncTakes = new ArrayList<>();
        List<Integer> syncTakes = new ArrayList<>();
        long start = System.nanoTime();
        for (int run = 0; run < RUNS; run++) {
            int unsync = addRun(Unsynchronised::new);
            unsyncTotals.add(unsync);
            if (unsync != 80) {
                unsyncAddFailures++;
            }
            int sync = addRun(Synchronised::new);
            syncTotals.add(sync);
            if (sync != 80) {
                syncAddFailures++;
            }
            int took = takeRun(Unsynchronised::new);
            unsyncTakes.add(took);
            if (took != 5) {
                unsyncTakeFailures++;
            }
            int syncTook = takeRun(Synchronised::new);
            syncTakes.add(syncTook);
            if (syncTook != 5) {
                syncTakeFailures++;
            }
        }
        long counterMs = (System.nanoTime() - start) / 1_000_000;
        List<String> thrown = new ArrayList<>();
        synchronized (THROWN) {
            for (String s : THROWN) {
                thrown.add(json(s));
            }
        }
        out.append("\"thrownInThreads\":[").append(String.join(",", thrown)).append("],");
        out.append("\"runs\":").append(RUNS)
                .append(",\"unsynchronisedAddFailed\":").append(unsyncAddFailures)
                .append(",\"synchronisedAddFailed\":").append(syncAddFailures)
                .append(",\"unsynchronisedTakeFailed\":").append(unsyncTakeFailures)
                .append(",\"synchronisedTakeFailed\":").append(syncTakeFailures)
                .append(",\"unsynchronisedTotals\":").append(unsyncTotals)
                .append(",\"synchronisedTotals\":").append(syncTotals)
                .append(",\"unsynchronisedTakesSucceeded\":").append(unsyncTakes)
                .append(",\"synchronisedTakesSucceeded\":").append(syncTakes)
                .append(",\"counterMs\":").append(counterMs);

        // Parallel split, 20 runs of each way of splitting.
        start = System.nanoTime();
        int[] detected = new int[Split.values().length];
        String[] sample = new String[Split.values().length];
        for (int run = 0; run < RUNS; run++) {
            for (Split split : Split.values()) {
                InstrumentedSource source = new InstrumentedSource(24);
                largest(source, 4, split);
                boolean ok = switch (split) {
                    case PARALLEL -> source.overlapped() && source.mostAtOnce == 4
                            && source.report().contains("\"skipped\":[],\"readTwice\":[]");
                    case ONE_AFTER_ANOTHER -> !source.overlapped() && source.mostAtOnce == 1;
                    case OVERLAPPING -> !source.report().contains("\"readTwice\":[]");
                    case SKIPS_ONE -> !source.report().contains("\"skipped\":[]");
                };
                if (ok) {
                    detected[split.ordinal()]++;
                }
                if (run == 0) {
                    sample[split.ordinal()] = source.report();
                }
            }
        }
        long splitMs = (System.nanoTime() - start) / 1_000_000;
        out.append(",\"split\":{");
        for (Split split : Split.values()) {
            out.append(split.ordinal() == 0 ? "" : ",").append(json(split.name()))
                    .append(":{\"detectedInRuns\":").append(detected[split.ordinal()])
                    .append(",\"firstRun\":").append(sample[split.ordinal()]).append("}");
        }
        out.append("},\"splitMs\":").append(splitMs).append("}");
        System.out.println(out);
    }

    static String json(String s) {
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
