/**
 * Repro, plus one string concatenation in each thread's catch block. The
 * thread that fails now ends with a ClassCastException that its own
 * catch (Throwable) does not stop: the concatenation inside the handler
 * throws it.
 */
public class ReproConcat {
    private int count;

    synchronized void add() throws InterruptedException {
        Thread.sleep(2);
        count++;
    }

    public static void main(String[] args) throws Exception {
        ReproConcat shared = new ReproConcat();
        String[] what = new String[8];
        Thread[] threads = new Thread[8];
        for (int i = 0; i < 8; i++) {
            int me = i;
            threads[i] = new Thread(() -> {
                try {
                    for (int k = 0; k < 10; k++) {
                        shared.add();
                    }
                    what[me] = "finished";
                } catch (Throwable e) {
                    what[me] = "caught " + e;
                }
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        System.out.println("count " + shared.count + " (expected 80)");
        for (int i = 0; i < 8; i++) System.out.println("thread " + i + ": " + what[i]);
    }
}
