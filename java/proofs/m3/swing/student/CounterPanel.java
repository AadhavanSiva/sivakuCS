import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;

/** Practice shape, as given plus the student's listeners: add one, reset, a label kept in step. */
public class CounterPanel extends JPanel {
    public final JButton add = new JButton("Add one");
    public final JButton reset = new JButton("Reset");
    public final JLabel label = new JLabel("Count: 0");
    private int count;

    public CounterPanel() {
        add(add);
        add(reset);
        add(label);
        // The student's listeners:
        add.addActionListener(e -> {
            count++;
            label.setText("Count: " + count);
        });
        reset.addActionListener(e -> {
            count = 0;
            label.setText("Count: " + count);
        });
    }
}
