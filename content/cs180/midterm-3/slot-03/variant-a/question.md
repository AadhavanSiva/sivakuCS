# Q3: Peak reading

A weather station's `Readings` is a read-only list of whole numbers. It is slow: each `get` takes a few
milliseconds, so the readings are searched by several threads at once.

Complete two classes.

**`PeakWorker`** is a `Runnable` that finds the largest reading in the slice from index `lo` up to, but not
including, `hi`. Its constructor takes the readings, `lo` and `hi`; a slice always has at least one reading.
`run()` searches the slice, and `getPeak()` returns what it found.

**`Peak.highest(Readings readings, int workers)`** returns the largest reading of all. It splits the readings
into exactly `workers` slices, starts one thread per slice so that they all run at the same time, waits for all of
them to finish, and combines their results. `workers` is from 1 to the number of readings.

Every index must be in exactly one slice: none skipped and none read by more than one thread. The slices may have
different sizes, as long as together they cover every index.

`Main.java` is read-only. Run it to try your classes.

## Sample run

Running `Main.java` prints:

```
Peak with 1 worker: 31
Peak with 4 workers: 31
```

The sample run is one of the tests. The rest are hidden.
