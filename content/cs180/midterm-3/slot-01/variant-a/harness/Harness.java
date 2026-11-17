import sivaku.harness.Check;

/** Hidden tests for LapCounterPanel: clicks with doClick(0), reads the label and the count. */
public class Harness {
    private static void click(javax.swing.JButton button, int times) {
        for (int i = 0; i < times; i++) {
            button.doClick(0);
        }
    }

    public static void sampleFromTheHandout() {
        LapCounterPanel panel = new LapCounterPanel();
        click(panel.addLap, 2);
        Check.equal("label after two clicks of Add lap", "Laps: 2", panel.laps.getText());
    }

    public static void startsAtZero() {
        LapCounterPanel panel = new LapCounterPanel();
        Check.equal("label of a new panel", "Laps: 0", panel.laps.getText());
        Check.equal("count of a new panel", 0, panel.count);
    }

    public static void oneLap() {
        LapCounterPanel panel = new LapCounterPanel();
        click(panel.addLap, 1);
        Check.equal("label", "Laps: 1", panel.laps.getText());
    }

    public static void threeLaps() {
        LapCounterPanel panel = new LapCounterPanel();
        click(panel.addLap, 3);
        Check.equal("label", "Laps: 3", panel.laps.getText());
    }

    public static void resetShowsZero() {
        LapCounterPanel panel = new LapCounterPanel();
        click(panel.addLap, 4);
        click(panel.reset, 1);
        Check.equal("label after reset", "Laps: 0", panel.laps.getText());
    }

    public static void countsAgainAfterReset() {
        LapCounterPanel panel = new LapCounterPanel();
        click(panel.addLap, 5);
        click(panel.reset, 1);
        click(panel.addLap, 1);
        Check.equal("label", "Laps: 1", panel.laps.getText());
    }

    public static void countMatchesTheLabel() {
        LapCounterPanel panel = new LapCounterPanel();
        click(panel.addLap, 4);
        Check.equal("count after four laps", 4, panel.count);
        click(panel.reset, 1);
        Check.equal("count after reset", 0, panel.count);
    }

    public static void panelsCountSeparately() {
        LapCounterPanel first = new LapCounterPanel();
        LapCounterPanel second = new LapCounterPanel();
        click(first.addLap, 3);
        click(second.addLap, 1);
        Check.equal("first panel", "Laps: 3", first.laps.getText());
        Check.equal("second panel", "Laps: 1", second.laps.getText());
    }

    public static void resetAtZeroThenMany() {
        LapCounterPanel panel = new LapCounterPanel();
        click(panel.reset, 1);
        Check.equal("label after reset at zero", "Laps: 0", panel.laps.getText());
        click(panel.addLap, 10);
        Check.equal("label after ten laps", "Laps: 10", panel.laps.getText());
    }
}
