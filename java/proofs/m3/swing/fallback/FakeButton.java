import java.awt.Component;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.util.ArrayList;
import java.util.List;

/** What JButton becomes: its listeners run when it is clicked while enabled. */
public class FakeButton extends Component {
    private String text;
    private final List<ActionListener> listeners = new ArrayList<>();

    public FakeButton() {
        this("");
    }

    public FakeButton(String text) {
        this.text = text;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public void addActionListener(ActionListener listener) {
        listeners.add(listener);
    }

    public void removeActionListener(ActionListener listener) {
        listeners.remove(listener);
    }

    public ActionListener[] getActionListeners() {
        return listeners.toArray(new ActionListener[0]);
    }

    public void doClick() {
        doClick(0);
    }

    public void doClick(int pressTime) {
        if (!isEnabled()) {
            return;
        }
        ActionEvent click = new ActionEvent(this, ActionEvent.ACTION_PERFORMED, text);
        for (ActionListener listener : new ArrayList<>(listeners)) {
            listener.actionPerformed(click);
        }
    }

    // Component.setEnabled checks focus, which starts AWT's toolkit; CheerpJ has none in a worker.
    private boolean enabled = true;

    @Override
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public boolean isFocusOwner() {
        return false;
    }

    @Override
    public boolean hasFocus() {
        return false;
    }
}
