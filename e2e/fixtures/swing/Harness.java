import javax.swing.SwingConstants;
import sivaku.harness.Check;

/** Drives EverythingPanel through its fields, as a grader would; see EverythingPanel. */
public class Harness {
    public static void builds() {
        EverythingPanel p = new EverythingPanel();
        Check.equal("total", "Total: 0", p.total.getText());
        Check.equal("clear's text", "Clear", p.clear.getText());
        Check.equal("clear starts disabled", false, p.clear.isEnabled());
        Check.equal("tooltip", "Start again", p.clear.getToolTipText());
        Check.equal("mnemonic", (int) 'C', p.clear.getMnemonic());
        Check.equal("amount's text", "5", p.amount.getText());
        Check.equal("amount's columns", 8, p.amount.getColumns());
        Check.equal("amount's alignment", SwingConstants.RIGHT, p.amount.getHorizontalAlignment());
        Check.equal("total's alignment", SwingConstants.RIGHT, p.total.getHorizontalAlignment());
        Check.equal("label for", p.amount, p.hint.getLabelFor());
        Check.equal("client property", "name", p.name.getClientProperty("role"));
        Check.equal("components in the panel", 5, p.getComponentCount());
        Check.equal("components in the row", 2, p.row.getComponentCount());
        Check.equal("listeners on add", 1, p.add.getActionListeners().length);
        Check.isTrue("never showing", !p.isShowing());
    }

    public static void clicksAndTyping() {
        EverythingPanel p = new EverythingPanel();
        p.add.doClick(0);
        Check.equal("total after one click", "Total: 5", p.total.getText());
        Check.equal("action command", "add-amount", p.lastCommand);
        Check.equal("event source", "add", p.lastSource);
        Check.equal("clear enabled after adding", true, p.clear.isEnabled());
        p.amount.setText(" 7 ");
        p.add.doClick();
        Check.equal("total after typing 7", "Total: 12", p.total.getText());
        p.amount.setText("lots");
        p.add.doClick(0);
        Check.equal("hint after a bad amount", "Not a number: lots", p.hint.getText());
        Check.equal("total unchanged", "Total: 12", p.total.getText());
    }

    public static void enterInTheField() {
        EverythingPanel p = new EverythingPanel();
        p.amount.setText("4");
        p.amount.postActionEvent();
        Check.equal("total after Enter", "Total: 4", p.total.getText());
    }

    public static void disabledAndCleared() {
        EverythingPanel p = new EverythingPanel();
        p.clear.doClick(0);
        Check.equal("a disabled button does nothing", "Total: 0", p.total.getText());
        p.add.doClick(0);
        p.clear.doClick(0);
        Check.equal("total after clear", "Total: 0", p.total.getText());
        Check.equal("clear disabled itself", false, p.clear.isEnabled());
        Check.equal("amount emptied", "", p.amount.getText());
        p.add.removeActionListener(p.add.getActionListeners()[0]);
        p.add.doClick(0);
        Check.equal("no listener, no change", "Total: 0", p.total.getText());
    }

    public static void removing() {
        EverythingPanel p = new EverythingPanel();
        p.dropTheRow();
        Check.equal("components after removing the row", 4, p.getComponentCount());
        p.add.setVisible(false);
        Check.equal("hidden", false, p.add.isVisible());
    }
}
