# Q9: Express parcel

`Parcel` is read-only. Write the class `ExpressParcel` in `ExpressParcel.java`: a `Parcel` that is delivered
within a set number of hours.

- The constructor takes a label, a weight in kilograms and a number of hours.
- A private field holds the number of hours, which `getHours()` returns.
- `getShippingCost()` returns the parcel's shipping cost plus 12.00.
- `toString()` returns the parcel's description and the hours, as in
  `Parcel Books (2.0 kg) express within 24 hours`.

`Main.java` is read-only. Run it to try your class.

## Sample run

Running `Main.java` prints:

```
Parcel Books (2.0 kg) express within 24 hours
Cost: $19.00
```

The sample run is one of the tests. The rest are hidden.
