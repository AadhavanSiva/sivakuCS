# Q4: Tram fare zones

The Harbour Line tram stops are numbered in this order:

| Number | Stop |
|---|---|
| 1 | Quayside |
| 2 | Millbrook |
| 3 | Ferndale |
| 4 | Copper Hill |
| 5 | Ashgrove |
| 6 | Lantern Square |
| 7 | Redcliff |
| 8 | Northgate |

Stops 1 to 3 are in the `inner` fare zone, stops 4 to 6 in the `middle` zone, and stops 7 and 8 in the `outer`
zone.

Write a program that reads a stop name using the prompt `Enter a stop name:` on its own line. Match the name
ignoring case. Print `Stop number: ` followed by the stop's number, then `Fare zone: ` followed by its zone. If
the name is not a stop on the line, print `Stop number: unknown` and `Fare zone: unknown`.

## Sample run

```
Enter a stop name:
[Ferndale]
Stop number: 3
Fare zone: inner
```

The sample run is one of the tests. The rest are hidden.
