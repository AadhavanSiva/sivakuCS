// Complete: you do not need to open or change this file.

/** Eight readings from one sensor; each get pauses briefly, as a real sensor would. */
public class SensorReadings implements Readings {
    private final int[] values = {12, -4, 27, 9, 31, 18, -11, 25};

    @Override
    public int size() {
        return values.length;
    }

    @Override
    public int get(int i) {
        try {
            Thread.sleep(3);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return values[i];
    }
}
