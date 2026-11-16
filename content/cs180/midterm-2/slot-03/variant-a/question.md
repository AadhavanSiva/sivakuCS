# Q3: Dimmer

Complete the class `Dimmer` in `Dimmer.java`. A dimmer's level is a whole number from 0 to 10.

- `setLevel(int level)` sets the level. A level outside 0 to 10 is ignored: the level does not change.
- The constructor sets the level by calling `setLevel`.
- `getLevel()` returns the level.
- `brighter()` raises the level by 1, and `dimmer()` lowers it by 1, but the level never goes above 10 or below 0.

`Main.java` is read-only. Run it to try your class.

## Sample run

Running `Main.java` prints:

```
Level: 4
Level: 5
Level: 9
```

The sample run is one of the tests. The rest are hidden.
