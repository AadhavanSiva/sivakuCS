/**
 * Hidden: runs the student's methods once on one thread before Run and
 * before each test. In CheerpJ, when several threads first run code whose
 * calls have not been made yet with the classes they now see, one thread
 * can silently die. So this uses exactly the Tally the concurrent tests use
 * (SlowTally) and no other: warming up with MemoryTally as well brings the
 * failure back (java/proofs/m3/threads, README).
 */
public class Warmup {
    public static void warmUp() {
        try {
            SeedBank bank = new SeedBank(new SlowTally(0));
            bank.add(3);
            bank.take(1);
            bank.take(9);
            bank.count();
        } catch (Throwable ignored) {
            // An unfinished class: the tests will say so.
        }
    }
}
