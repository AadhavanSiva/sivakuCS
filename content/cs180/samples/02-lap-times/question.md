# Lap times

A running club records lap times, in seconds, one per line, in a file called `laps.txt`.
Write a program in `Main.java` that reads `laps.txt` and writes a summary to `best.txt`:

```
Laps: <number of laps>
Fastest: <the smallest time, two decimals>
Average: <the mean time, two decimals>
```

Blank lines in `laps.txt` are not laps; skip them. If `best.txt` already exists, replace it.
On success the program prints nothing.

If `laps.txt` does not exist, or contains no laps, print `No laps recorded.` and do not create `best.txt`.

## Sample

`laps.txt`:

```
62.5
61.2
64.0
64.5
```

`best.txt` afterwards:

```
Laps: 4
Fastest: 61.20
Average: 63.05
```

Your workspace has this `laps.txt`, so **Run** reads it. The sample is one of the tests. The rest are hidden.
