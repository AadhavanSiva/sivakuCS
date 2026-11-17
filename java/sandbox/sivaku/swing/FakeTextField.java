package sivaku.swing;

import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.List;
import javax.swing.SwingConstants;

/**
 * What JTextField (and JTextComponent) becomes; see FakeComponent. Its
 * action listeners run when Enter is pressed in it (in Run) or postActionEvent() is called.
 */
public class FakeTextField extends FakeComponent {
    private String text;
    private int columns;
    private boolean editable = true;
    private int horizontalAlignment = SwingConstants.LEADING;
    private String actionCommand;
    private final List<ActionListener> listeners = new ArrayList<>();
    private int caret;

    public FakeTextField() {
        this(null, 0);
    }

    public FakeTextField(String text) {
        this(text, 0);
    }

    public FakeTextField(int columns) {
        this(null, columns);
    }

    public FakeTextField(String text, int columns) {
        if (columns < 0) {
            throw new IllegalArgumentException("columns less than zero.");
        }
        this.text = text == null ? "" : text;
        this.columns = columns;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text == null ? "" : text;
        this.caret = this.text.length();
    }

    public String getSelectedText() {
        return null;
    }

    public void selectAll() {
    }

    public void select(int start, int end) {
    }

    public int getCaretPosition() {
        return caret;
    }

    public void setCaretPosition(int position) {
        if (position < 0 || position > text.length()) {
            throw new IllegalArgumentException("bad position: " + position);
        }
        this.caret = position;
    }

    public int getColumns() {
        return columns;
    }

    public void setColumns(int columns) {
        if (columns < 0) {
            throw new IllegalArgumentException("columns less than zero.");
        }
        this.columns = columns;
    }

    public boolean isEditable() {
        return editable;
    }

    public void setEditable(boolean editable) {
        this.editable = editable;
    }

    public int getHorizontalAlignment() {
        return horizontalAlignment;
    }

    public void setHorizontalAlignment(int alignment) {
        this.horizontalAlignment = alignment;
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

    public void setActionCommand(String command) {
        this.actionCommand = command;
    }

    /** As pressing Enter in the field: runs its action listeners. */
    public void postActionEvent() {
        ActionEvent enter = new ActionEvent(this, ActionEvent.ACTION_PERFORMED,
                actionCommand != null ? actionCommand : text, System.currentTimeMillis(), 0);
        for (ActionListener listener : new ArrayList<>(listeners)) {
            listener.actionPerformed(enter);
        }
    }

    public void cut() {
    }

    public void copy() {
    }

    public void paste() {
    }

    @Override
    String describe(int id) {
        return "{\"id\":" + id + ",\"kind\":\"field\",\"text\":" + json(text) + ",\"columns\":" + columns
                + ",\"enabled\":" + isEnabled() + ",\"editable\":" + editable + ",\"visible\":" + isVisible() + "}";
    }
}
