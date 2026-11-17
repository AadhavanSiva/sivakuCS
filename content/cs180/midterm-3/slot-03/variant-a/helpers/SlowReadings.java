import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Hidden: readings that record who read what. Each get pauses, records the
 * reading thread for that index, and counts how many threads were reading
 * at the same moment, so the tests can tell parallel from serial, and spot
 * skipped or doubly read indexes and reads made by the calling thread.
 */
public class SlowReadings implements Readings {
    private final int[] values;
    private final List<List<Thread>> readers = new ArrayList<>();
    private int active;
    private int mostAtOnce;

    public SlowReadings(int... values) {
        this.values = values;
        for (int i = 0; i < values.length; i++) {
            readers.add(new ArrayList<>());
        }
    }

    @Override
    public int size() {
        return values.length;
    }

    @Override
    public int get(int i) {
        synchronized (this) {
            readers.get(i).add(Thread.currentThread());
            active++;
            mostAtOnce = Math.max(mostAtOnce, active);
        }
        try {
            Thread.sleep(4);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        synchronized (this) {
            active--;
        }
        return values[i];
    }

    /** @return the indexes nobody read */
    public synchronized List<Integer> skipped() {
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < values.length; i++) {
            if (readers.get(i).isEmpty()) {
                out.add(i);
            }
        }
        return out;
    }

    /** @return the indexes read more than once */
    public synchronized List<Integer> readTwice() {
        List<Integer> out = new ArrayList<>();
        for (int i = 0; i < values.length; i++) {
            if (readers.get(i).size() > 1) {
                out.add(i);
            }
        }
        return out;
    }

    /** @return how many different threads read anything */
    public synchronized int threads() {
        Set<Thread> all = new HashSet<>();
        for (List<Thread> r : readers) {
            all.addAll(r);
        }
        return all.size();
    }

    /** @return whether the given thread read any index itself */
    public synchronized boolean readBy(Thread thread) {
        for (List<Thread> r : readers) {
            if (r.contains(thread)) {
                return true;
            }
        }
        return false;
    }

    public synchronized int mostAtOnce() {
        return mostAtOnce;
    }
}
