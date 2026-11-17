import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import sivaku.harness.Check;

/**
 * Hidden tests for SeedBank: one thread first (1 point each), then many
 * threads on a slow tally that sleeps between read and write, so missing
 * synchronisation fails every time (2 points each).
 */
public class Harness {
    private static void together(List<Thread> threads) throws InterruptedException {
        for (Thread t : threads) {
            t.start();
        }
        for (Thread t : threads) {
            t.join();
        }
    }

    private static List<Thread> copies(int n, Runnable work) {
        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            threads.add(new Thread(work));
        }
        return threads;
    }

    /**
     * The student's SeedBank, but count(), after returning, waits outside
     * any lock until all `racers` threads have called it (or 300 ms pass).
     * A take() that checks with count() and then changes the count in a
     * second step therefore has every racer check before any changes it, so
     * it oversells every time, whatever the scheduler does.
     *
     * A correct take() either never calls count() or calls it while holding
     * a lock, so no other racer can get past it: there is nothing to wait
     * for, and count() returns at once. (A lock this cannot see, such as a
     * private lock object, waits at most 300 ms per call, and only the first
     * racers - 1 calls wait at all: under 3.5 s per case. Never a hang.)
     */
    private static SeedBank racing(Tally tally, int racers) {
        CountDownLatch everyone = new CountDownLatch(racers);
        return new SeedBank(tally) {
            @Override
            public int count() {
                int held = super.count();
                everyone.countDown();
                if (Thread.holdsLock(this) || Thread.holdsLock(tally)) {
                    return held;
                }
                try {
                    everyone.await(300, TimeUnit.MILLISECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                return held;
            }
        };
    }

    public static void sampleFromTheHandout() {
        SeedBank bank = new SeedBank(new MemoryTally());
        bank.add(12);
        Check.equal("take(5) from 12", true, bank.take(5));
        Check.equal("take(20) from 7", false, bank.take(20));
        Check.equal("count", 7, bank.count());
    }

    public static void addsUp() {
        SeedBank bank = new SeedBank(new MemoryTally());
        bank.add(5);
        bank.add(7);
        Check.equal("count after adding 5 and 7", 12, bank.count());
    }

    public static void takeWhenEnough() {
        SeedBank bank = new SeedBank(new MemoryTally());
        bank.add(10);
        Check.equal("take(4) from 10", true, bank.take(4));
        Check.equal("count", 6, bank.count());
    }

    public static void takeWhenTooFew() {
        SeedBank bank = new SeedBank(new MemoryTally());
        bank.add(3);
        Check.equal("take(4) from 3", false, bank.take(4));
        Check.equal("count unchanged", 3, bank.count());
    }

    public static void takeExactlyAll() {
        SeedBank bank = new SeedBank(new MemoryTally());
        bank.add(6);
        Check.equal("take(6) from 6", true, bank.take(6));
        Check.equal("count", 0, bank.count());
        Check.equal("take(1) from 0", false, bank.take(1));
    }

    public static void manyAddsTogether() throws InterruptedException {
        SlowTally tally = new SlowTally(0);
        SeedBank bank = new SeedBank(tally);
        together(copies(8, () -> {
            for (int i = 0; i < 10; i++) {
                bank.add(1);
            }
        }));
        Check.equal("packets after 8 threads each add 1 ten times", 80, tally.peek());
    }

    public static void raceForTheLastPackets() throws InterruptedException {
        SlowTally tally = new SlowTally(5);
        SeedBank bank = racing(tally, 12);
        AtomicInteger succeeded = new AtomicInteger();
        together(copies(12, () -> {
            if (bank.take(1)) {
                succeeded.incrementAndGet();
            }
        }));
        Check.equal("takes that succeeded when 12 threads race for 5 packets", 5, succeeded.get());
        Check.equal("packets left", 0, tally.peek());
        Check.isTrue("the count never went below zero", tally.lowest() >= 0);
    }

    public static void addsAndTakesTogether() throws InterruptedException {
        SlowTally tally = new SlowTally(6);
        SeedBank bank = racing(tally, 8);
        AtomicInteger taken = new AtomicInteger();
        List<Thread> threads = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            threads.add(new Thread(() -> {
                for (int k = 0; k < 3; k++) {
                    bank.add(2);
                }
            }));
            threads.add(new Thread(() -> {
                for (int k = 0; k < 2; k++) {
                    if (bank.take(3)) {
                        taken.addAndGet(3);
                    }
                }
            }));
        }
        together(threads);
        Check.equal("packets: 6 + 24 added, less those taken", 6 + 24 - taken.get(), tally.peek());
        Check.isTrue("the count never went below zero", tally.lowest() >= 0);
    }

    public static void raceToTakeSeveral() throws InterruptedException {
        SlowTally tally = new SlowTally(10);
        SeedBank bank = racing(tally, 8);
        AtomicInteger succeeded = new AtomicInteger();
        together(copies(8, () -> {
            if (bank.take(3)) {
                succeeded.incrementAndGet();
            }
        }));
        Check.equal("takes of 3 that succeeded from 10 packets", 3, succeeded.get());
        Check.equal("packets left", 1, tally.peek());
    }
}
