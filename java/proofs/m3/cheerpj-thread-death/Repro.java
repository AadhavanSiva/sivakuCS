/**
 * CheerpJ 5.0 (Java 25): eight threads each call a synchronized method ten
 * times; the method sleeps 2 ms while holding the lock. On the JDK this
 * always prints "count 80". In a fresh CheerpJ JVM one thread's first call
 * throws an exception with no stack frames, so the count is 70.
 *
 * Args:
 *   warm   calls add() once on the main thread before starting the threads
 *   quiet  reports only the exception's class, never calling toString() or
 *          getStackTrace() on it
 *
 * The threads do no string concatenation: see ReproConcat for that.
 */
public class Repro {
    private int count;

    synchronized void add() throws InterruptedException {
        Thread.sleep(2);
        count++;
    }

    public static void main(String[] args) throws Exception {
        java.util.List<String> flags = java.util.Arrays.asList(args);
        Repro shared = new Repro();
        if (flags.contains("warm")) {
            shared.add();
            shared.count = 0;
        }
        int[] calls = new int[8];
        Throwable[] caught = new Throwable[8];
        Thread[] threads = new Thread[8];
        for (int i = 0; i < 8; i++) {
            int me = i;
            threads[i] = new Thread(() -> {
                try {
                    for (int k = 0; k < 10; k++) {
                        calls[me]++;
                        shared.add();
                    }
                } catch (Throwable e) {
                    caught[me] = e;
                }
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        System.out.println("count " + shared.count + " (expected 80)");
        for (int i = 0; i < 8; i++) {
            if (caught[i] == null) {
                continue;
            }
            if (flags.contains("quiet")) {
                System.out.println("thread " + i + " threw " + caught[i].getClass().getName() + " in call " + calls[i]);
                continue;
            }
            System.out.println("thread " + i + " threw " + caught[i] + " in call " + calls[i] + " of add()");
            try {
                System.out.println("  its stack trace has " + caught[i].getStackTrace().length + " frames");
            } catch (Throwable e) {
                System.out.println("  and getStackTrace() on it throws " + e);
            }
        }
    }
}
