import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GridLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import javax.swing.AbstractButton;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComponent;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextField;
import javax.swing.SwingConstants;

/**
 * A panel that uses the JPanel, JButton, JLabel and JTextField methods a
 * course question might, so the Swing fakes are known to cover them
 * (e2e/m3-grading.spec.ts). Everything a listener does is visible through
 * the fields.
 */
public class EverythingPanel extends JPanel {
    JButton add = new JButton("Add");
    JButton clear = new JButton();
    JLabel total = new JLabel("Total: 0", SwingConstants.CENTER);
    JLabel hint = new JLabel();
    JTextField amount = new JTextField("5", 6);
    JTextField name = new JTextField(10);
    JPanel row = new JPanel(new GridLayout(1, 2));
    int sum;
    String lastCommand = "";
    String lastSource = "";

    public EverythingPanel() {
        super(new BorderLayout());
        setBorder(BorderFactory.createEmptyBorder(8, 8, 8, 8));
        setPreferredSize(new Dimension(300, 120));
        setBackground(Color.WHITE);
        setOpaque(true);

        clear.setText("Clear");
        clear.setEnabled(false);
        clear.setToolTipText("Start again");
        clear.setMnemonic('C');
        add.setActionCommand("add-amount");
        add.setFont(new Font("SansSerif", Font.BOLD, 14));
        add.setForeground(Color.BLUE);
        total.setHorizontalAlignment(SwingConstants.RIGHT);
        hint.setText("Type an amount");
        hint.setLabelFor(amount);
        amount.setHorizontalAlignment(JTextField.RIGHT);
        amount.setColumns(8);
        name.setEditable(true);
        name.putClientProperty("role", "name");

        row.add(add);
        row.add(clear);
        add(row, BorderLayout.NORTH);
        add(amount, BorderLayout.CENTER);
        add(total, BorderLayout.SOUTH);
        add(hint, BorderLayout.EAST);
        add(name, BorderLayout.WEST);

        ActionListener adder = e -> {
            lastCommand = e.getActionCommand();
            lastSource = e.getSource() == add ? "add" : "other";
            try {
                sum += Integer.parseInt(amount.getText().trim());
                total.setText("Total: " + sum);
                clear.setEnabled(true);
            } catch (NumberFormatException ex) {
                hint.setText("Not a number: " + amount.getText());
            }
        };
        add.addActionListener(adder);
        amount.addActionListener(adder);
        clear.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                AbstractButton source = (AbstractButton) e.getSource();
                sum = 0;
                total.setText("Total: 0");
                source.setEnabled(false);
                amount.setText("");
                amount.requestFocusInWindow();
            }
        });
        JComponent first = add;
        first.setVisible(true);
        revalidate();
        repaint();
    }

    void dropTheRow() {
        remove(row);
        revalidate();
    }
}
