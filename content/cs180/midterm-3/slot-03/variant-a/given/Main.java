// Complete: you do not need to open or change this file.

void main() throws InterruptedException {
    Readings readings = new SensorReadings();
    IO.println("Peak with 1 worker: " + Peak.highest(readings, 1));
    IO.println("Peak with 4 workers: " + Peak.highest(readings, 4));
}
