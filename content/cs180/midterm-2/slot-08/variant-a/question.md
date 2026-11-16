# Q8: Temperature summary

Each line of `temperatures.txt` holds one whole number, which may be negative. The file has at least one line.

Write a program that reads `temperatures.txt` and writes `summary.txt` with four lines: the number of readings,
their average to two decimals, the lowest reading, and how many readings are below zero, as in the sample.
Otherwise the program prints nothing.

If `temperatures.txt` does not exist, print `Could not open temperatures.txt` and write no file. The program must
not crash.

## Sample run

With the `temperatures.txt` in your workspace, the program prints nothing. Afterwards, `summary.txt` holds:

```
Readings: 5
Average: 3.40
Lowest: -4
Below zero: 2
```

The sample run is one of the tests. The rest are hidden.
