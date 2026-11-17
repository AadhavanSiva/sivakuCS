import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;

/** A lap counter: one button adds a lap, the other starts again from 0. */
public class LapCounterPanel extends JPanel {
    JButton addLap;
    JButton reset;
    JLabel laps;
    int count;

    public LapCounterPanel() {
        addLap = new JButton("Add lap");
        reset = new JButton("Reset");
        laps = new JLabel("Laps: 0");
        add(addLap);
        add(reset);
        add(laps);

        // Add your listeners here.
        addLap.addActionListener(e -> {
            count++;
            laps.setText("Laps: " + count);
        });
        reset.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                count = 0;
                laps.setText("Laps: " + count);
            }
        });
    }
}
