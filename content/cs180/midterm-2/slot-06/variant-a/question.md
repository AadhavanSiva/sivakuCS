# Q6: Ferry ticket

`Passenger` is read-only. Complete the class `Ticket` in `Ticket.java`. A ticket holds a passenger and a base
price.

- The constructor stores the passenger and the base price.
- `getPassenger()` and `getBasePrice()` return them, and `setBasePrice(double basePrice)` changes the base price.
- `getCost()` returns the base price, less 25% if the passenger is a senior.
- `toString()` returns the passenger's name and the cost to two decimals, in exactly this form:
  `Ticket[passenger=Ana Ruiz, cost=$12.00]`

`Main.java` is read-only. Run it to try your class.

## Sample run

Running `Main.java` prints:

```
Ticket[passenger=Ana Ruiz, cost=$16.00]
Ticket[passenger=Joe Banks, cost=$12.00]
```

The sample run is one of the tests. The rest are hidden.
