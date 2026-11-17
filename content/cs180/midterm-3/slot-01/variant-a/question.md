# Q1: Lap counter

`LapCounterPanel` is a panel for a swimming coach. Its constructor already creates two buttons and a label and
adds them to the panel. Do not rename the fields or change how the components are created.

In the marked place in the constructor, add action listeners so that:

- **Add lap** adds one to `count` and the label then reads `Laps: ` followed by the count;
- **Reset** sets `count` back to 0 and the label then reads `Laps: 0`.

The label starts as `Laps: 0`, and `count` must always match what the label shows. Each `LapCounterPanel` has
its own count.

`LapCounterMain.java` shows the panel in a window on your own computer. Here, press Run to try your panel.

## Sample run

After **Add lap** is clicked twice, the label reads:

```
Laps: 2
```

The sample run is one of the tests. The rest are hidden.
