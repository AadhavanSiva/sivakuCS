# Q8: Seat sales

`Main.java` starts by reading a grid of whole numbers with `Grid.read()`, which is provided. It prints its own
prompts, reads the number of rows, the number of columns and each row's numbers, and returns an `int[][]`. The
grid has at least one row and one column. Entries may be negative.

For each row, in order, print the row's index and the sum of its entries, as in `Row 0 total: 9`.

Then print the largest entry and its row and column, as in `Largest: 7 at row 1, column 1`. If
the largest value appears more than once, give the first, reading rows from top to bottom and each row from left
to right. Rows and columns are indexed from 0.

## Sample run

```
Enter the number of rows:
[2]
Enter the number of columns:
[3]
Enter row 0:
[4 -1 6]
Enter row 1:
[0 7 3]
Row 0 total: 9
Row 1 total: 10
Largest: 7 at row 1, column 1
```

The sample run is one of the tests. The rest are hidden.
