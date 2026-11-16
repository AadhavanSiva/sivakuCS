import java.awt.Component;

/** What JTextField becomes. */
public class FakeTextField extends Component {
    private String text;

    public FakeTextField() {
        this("");
    }

    public FakeTextField(int columns) {
        this("");
    }

    public FakeTextField(String text) {
        this.text = text;
    }

    public FakeTextField(String text, int columns) {
        this(text);
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text == null ? "" : text;
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
