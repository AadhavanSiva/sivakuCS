# Q10: Rover battery

Write a program that controls a rover from a menu, in a loop. The battery starts at 50.

At the start of each round, print `Battery: ` followed by the battery's charge. If the charge is 0 or below,
print `The rover is out of power.` and stop. Otherwise show a menu, worded as you like, and read a whole number:

| Choice | Effect |
|---|---|
| `1` | Drive: the charge goes down by 15 |
| `2` | Recharge: the charge goes up by 10, but never above 60 |
| `3` | Park: print `Final battery: ` followed by the charge, and stop |
| anything else | The charge goes down by 5 |

## Sample run

```
Battery: 50
1) Drive  2) Recharge  3) Park
[1]
Battery: 35
1) Drive  2) Recharge  3) Park
[2]
Battery: 45
1) Drive  2) Recharge  3) Park
[1]
Battery: 30
1) Drive  2) Recharge  3) Park
[3]
Final battery: 30
```

The sample run is one of the tests. The rest are hidden.
