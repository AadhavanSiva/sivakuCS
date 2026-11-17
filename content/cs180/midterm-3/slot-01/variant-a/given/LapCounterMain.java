// Complete: you do not need to open or change this file.
// It shows the panel in a window when run on your own computer. The grader
// never opens a window: it tests LapCounterPanel directly.
import javax.swing.JFrame;
import javax.swing.SwingUtilities;

public class LapCounterMain {
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("Lap counter");
            frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.add(new LapCounterPanel());
            frame.pack();
            frame.setVisible(true);
        });
    }
}
