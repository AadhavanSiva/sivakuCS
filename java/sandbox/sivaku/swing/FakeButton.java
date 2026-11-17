package sivaku.swing;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.List;
import javax.swing.Icon;
import javax.swing.SwingConstants;

/**
 * What JButton (and AbstractButton) becomes; see FakeComponent. Its action
 * listeners run, in the order added, when it is clicked while enabled.
 */
public class FakeButton extends FakeComponent {
    private String text;
    private Icon icon;
    private String actionCommand;
    private final List<ActionListener> listeners = new ArrayList<>();
    private boolean selected;
    private int mnemonic;
    private int horizontalAlignment = SwingConstants.CENTER;
    private int verticalAlignment = SwingConstants.CENTER;
    private boolean borderPainted = true;
    private boolean contentAreaFilled = true;
    private boolean focusPainted = true;

    public FakeButton() {
        this(null, null);
    }

    public FakeButton(String text) {
        this(text, null);
    }

    public FakeButton(Icon icon) {
        this(null, icon);
    }

    public FakeButton(String text, Icon icon) {
        this.text = text == null ? "" : text;
        this.icon = icon;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    /** @deprecated as in AbstractButton */
    @Deprecated
    public String getLabel() {
        return text;
    }

    /** @deprecated as in AbstractButton */
    @Deprecated
    public void setLabel(String label) {
        this.text = label;
    }

    public Icon getIcon() {
        return icon;
    }

    public void setIcon(Icon icon) {
        this.icon = icon;
    }

    public void addActionListener(ActionListener listener) {
        if (listener != null) {
            listeners.add(listener);
        }
    }

    public void removeActionListener(ActionListener listener) {
        listeners.remove(listener);
    }

    public ActionListener[] getActionListeners() {
        return listeners.toArray(new ActionListener[0]);
    }

    public String getActionCommand() {
        return actionCommand != null ? actionCommand : text;
    }

    public void setActionCommand(String command) {
        this.actionCommand = command;
    }

    public void doClick() {
        doClick(0);
    }

    /** Runs the action listeners if enabled; the press time is ignored (no screen to show it on). */
    public void doClick(int pressTime) {
        if (!isEnabled()) {
            return;
        }
        ActionEvent click = new ActionEvent(this, ActionEvent.ACTION_PERFORMED, getActionCommand(),
                System.currentTimeMillis(), 0);
        for (ActionListener listener : new ArrayList<>(listeners)) {
            listener.actionPerformed(click);
        }
    }

    public boolean isSelected() {
        return selected;
    }

    public void setSelected(boolean selected) {
        this.selected = selected;
    }

    public int getMnemonic() {
        return mnemonic;
    }

    public void setMnemonic(int mnemonic) {
        this.mnemonic = mnemonic;
    }

    public void setMnemonic(char mnemonic) {
        this.mnemonic = Character.toUpperCase(mnemonic);
    }

    public int getHorizontalAlignment() {
        return horizontalAlignment;
    }

    public void setHorizontalAlignment(int alignment) {
        this.horizontalAlignment = alignment;
    }

    public int getVerticalAlignment() {
        return verticalAlignment;
    }

    public void setVerticalAlignment(int alignment) {
        this.verticalAlignment = alignment;
    }

    public boolean isBorderPainted() {
        return borderPainted;
    }

    public void setBorderPainted(boolean painted) {
        this.borderPainted = painted;
    }

    public boolean isContentAreaFilled() {
        return contentAreaFilled;
    }

    public void setContentAreaFilled(boolean filled) {
        this.contentAreaFilled = filled;
    }

    public boolean isFocusPainted() {
        return focusPainted;
    }

    public void setFocusPainted(boolean painted) {
        this.focusPainted = painted;
    }

    @Override
    String describe(int id) {
        return "{\"id\":" + id + ",\"kind\":\"button\",\"text\":" + json(text) + ",\"enabled\":" + isEnabled()
                + ",\"visible\":" + isVisible() + "}";
    }
}
