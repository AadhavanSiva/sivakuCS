import java.awt.GraphicsEnvironment;
import java.awt.Window;
import java.util.concurrent.atomic.AtomicReference;
import javax.swing.JButton;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;

/**
 * Midterm 3 proof 4 (cs180-exam-specs section 8): can Swing listener
 * questions be graded without a window? Builds panels like the practice
 * and real questions, clicks with doClick(), types with setText(), and reads
 * the labels. Prints one JSON object on standard output.
 */
public class SwingProof {
    /** Practice shape: add one, reset, a label kept in step with an int field. */
    static final class CounterPanel extends JPanel {
        final JButton add = new JButton("Add one");
        final JButton reset = new JButton("Reset");
        final JLabel label = new JLabel("Count: 0");
        private int count;

        CounterPanel() {
            add(add);
            add(reset);
            add(label);
            // What the student writes, in the marked place:
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

    /** Real shape: read a field on click, trim it, show money to two decimals or an error. */
    static final class PricePanel extends JPanel {
        final JTextField hours = new JTextField(6);
        final JButton price = new JButton("Price");
        final JLabel label = new JLabel("Enter the hours");

        PricePanel() {
            add(hours);
            add(price);
            add(label);
            price.addActionListener(e -> {
                try {
                    double h = Double.parseDouble(hours.getText().trim());
                    label.setText(h < 0 ? "Hours must be 0 or more" : String.format("Cost: $%.2f", h * 12.5));
                } catch (NumberFormatException ex) {
                    label.setText("Hours must be a number");
                }
            });
        }
    }

    public static void main(String[] args) throws Exception {
        // "headless" on standard input asks for AWT's headless mode before anything loads.
        String mode = new String(System.in.readAllBytes()).trim();
        if (mode.equals("headless")) {
            System.setProperty("java.awt.headless", "true");
        }
        // Swing reports a look and feel it cannot load without saying why; install it ourselves first.
        String lookAndFeel;
        try {
            javax.swing.UIManager.setLookAndFeel(new javax.swing.plaf.metal.MetalLookAndFeel());
            lookAndFeel = null;
        } catch (Throwable t) {
            lookAndFeel = describe(t);
        }
        try {
            String proved = prove();
            System.out.println(proved.substring(0, proved.length() - 1) + ",\"mode\":" + json(mode) + "}");
        } catch (Throwable t) {
            // Report why, rather than exit: the browser test records it.
            System.out.println("{\"works\":false,\"mode\":" + json(mode) + ",\"error\":" + json(describe(t))
                    + ",\"lookAndFeelError\":" + json(lookAndFeel) + "}");
        }
    }

    /** The exception, its causes, and where the deepest one was thrown. */
    static String describe(Throwable t) {
        StringBuilder chain = new StringBuilder();
        Throwable last = t;
        for (Throwable c = t; c != null; c = c.getCause()) {
            chain.append(chain.length() == 0 ? "" : " <- ").append(c);
            last = c;
        }
        StackTraceElement[] frames = last.getStackTrace();
        for (int i = 0; i < Math.min(8, frames.length); i++) {
            chain.append(i == 0 ? " at " : " / ").append(frames[i]);
        }
        return chain.toString();
    }

    static String prove() throws Exception {
        StringBuilder out = new StringBuilder("{\"works\":true");
        out.append(",\"headless\":").append(GraphicsEnvironment.isHeadless());

        long start = System.nanoTime();
        CounterPanel a = new CounterPanel();
        long firstPanelMs = (System.nanoTime() - start) / 1_000_000;
        CounterPanel b = new CounterPanel();
        start = System.nanoTime();
        a.add.doClick();
        a.add.doClick();
        a.add.doClick();
        String afterThree = a.label.getText();
        b.add.doClick();
        String otherPanel = b.label.getText();
        a.reset.doClick();
        String afterReset = a.label.getText();
        long clicksMs = (System.nanoTime() - start) / 1_000_000;
        // doClick() holds the button down for 68 ms; doClick(0) does not.
        start = System.nanoTime();
        for (int i = 0; i < 5; i++) {
            b.add.doClick(0);
        }
        long quickClicksMs = (System.nanoTime() - start) / 1_000_000;
        String afterQuick = b.label.getText();
        out.append(",\"counter\":{\"afterThreeClicks\":").append(json(afterThree))
                .append(",\"afterFiveQuickClicks\":").append(json(afterQuick))
                .append(",\"fiveQuickClicksMs\":").append(quickClicksMs)
                .append(",\"otherPanelAfterOneClick\":").append(json(otherPanel))
                .append(",\"afterReset\":").append(json(afterReset))
                .append(",\"firstPanelMs\":").append(firstPanelMs)
                .append(",\"fiveClicksMs\":").append(clicksMs).append("}");

        PricePanel p = new PricePanel();
        String initial = p.label.getText();
        p.hours.setText(" 3 ");
        p.price.doClick();
        String priced = p.label.getText();
        p.hours.setText("three");
        p.price.doClick();
        String notNumber = p.label.getText();
        p.hours.setText("-1");
        p.price.doClick();
        String negative = p.label.getText();
        out.append(",\"price\":{\"initial\":").append(json(initial))
                .append(",\"after3\":").append(json(priced))
                .append(",\"afterThree\":").append(json(notNumber))
                .append(",\"afterMinus1\":").append(json(negative)).append("}");

        // The same clicks on Swing's own event thread, as a careful grader would.
        AtomicReference<String> onEdt = new AtomicReference<>();
        Thread edt = new Thread(() -> {
            try {
                SwingUtilities.invokeAndWait(() -> {
                    CounterPanel c = new CounterPanel();
                    c.add.doClick();
                    onEdt.set(c.label.getText());
                });
            } catch (Exception e) {
                onEdt.set("failed: " + e);
            }
        });
        edt.setDaemon(true);
        start = System.nanoTime();
        edt.start();
        edt.join(10_000);
        long edtMs = (System.nanoTime() - start) / 1_000_000;
        out.append(",\"eventThread\":{\"label\":").append(json(onEdt.get()))
                .append(",\"ms\":").append(edtMs).append("}");

        out.append(",\"windows\":").append(Window.getWindows().length)
                .append(",\"anyShowing\":").append(a.isShowing() || p.isShowing()).append("}");
        return out.toString();
    }

    static String json(String s) {
        return s == null ? "null" : "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
