# Q10: Rental fleet

`Rental`, `Bike` and `Scooter` are read-only; `Bike` and `Scooter` extend `Rental`. Complete the class `Fleet` in
`Fleet.java`:

- `describe(Rental r)` returns a description chosen by the kind of rental:
  - a bike: `Bike `, its id, ` with `, its gears and ` gears`, as in `Bike B7 with 21 gears`;
  - a scooter: `Scooter `, its id, ` at $`, its hourly rate to two decimals and ` an hour`, as in
    `Scooter S2 at $3.50 an hour`;
  - any other rental: `Rental ` and its id, as in `Rental T1`.
- `countScooters(Rental[] items)` returns how many of the rentals are scooters.

`Main.java` is read-only. Run it to try your class.

## Sample run

Running `Main.java` prints:

```
Bike B7 with 21 gears
Scooter S2 at $3.50 an hour
Rental T1
Scooters: 1
```

The sample run is one of the tests. The rest are hidden.
