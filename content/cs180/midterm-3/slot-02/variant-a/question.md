# Q2: Seed bank

A community seed bank keeps its number of seed packets in a `Tally`, which stores one whole number. A `Tally` is
slow, like a real device: each `get` and `set` takes a moment.

Complete `SeedBank` in `SeedBank.java`:

- the constructor keeps the `Tally` it is given;
- `add(int n)` adds `n` packets;
- `take(int n)` removes `n` packets and returns `true` if at least `n` are held; otherwise it changes nothing and
  returns `false`;
- `count()` returns the number of packets held.

Several threads share one `SeedBank`. Each read, change and write of the tally must not interleave with another
thread's: every `add` counts exactly once, when several threads race to take the last packets only as many succeed
as there are packets, and the count never goes below zero.

`Main.java` is read-only. Run it to try your class.

## Sample run

Running `Main.java` prints:

```
Took 5: true
Took 20: false
Count: 7
```

The sample run is one of the tests. The rest are hidden.
