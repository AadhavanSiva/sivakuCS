import java.awt.Component;

/** What JLabel becomes. */
public class FakeLabel extends Component {
    private String text;

    public FakeLabel() {
        this("");
    }

    public FakeLabel(String text) {
        this.text = text;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
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
