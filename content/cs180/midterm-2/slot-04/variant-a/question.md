# Q4: Ledger

`Transaction`, `Purchase` and `Refund` are read-only. A transaction has a label and an amount; a refund's amount
is negative.

Complete the class `Ledger` in `Ledger.java`:

- `total(Transaction[] items)` returns the sum of the amounts, or `0.0` if the array is empty.
- `largest(Transaction[] items)` returns the label of the transaction with the largest amount; if several share
  the largest amount, the first of them. It returns `""` if the array is empty.

`Main.java` is read-only. Run it to try your class.

## Sample run

Running `Main.java` prints:

```
Total: 49.75
Largest: Canvas
```

The sample run is one of the tests. The rest are hidden.
