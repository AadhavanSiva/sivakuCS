import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextField;

/** Real shape: read the field on click, trim it, money to two decimals or an error. An inner-class listener. */
public class PricePanel extends JPanel {
    public final JTextField hours = new JTextField(6);
    public final JButton price = new JButton("Price");
    public final JLabel label = new JLabel("Enter the hours");

    public PricePanel() {
        add(hours);
        add(price);
        add(label);
        price.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                try {
                    double h = Double.parseDouble(hours.getText().trim());
                    label.setText(h < 0 ? "Hours must be 0 or more" : String.format("Cost: $%.2f", h * 12.5));
                } catch (NumberFormatException ex) {
                    label.setText("Hours must be a number");
                }
            }
        });
    }
}
