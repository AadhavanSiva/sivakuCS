package sivaku.swing;

import java.awt.Component;
import javax.swing.Icon;
import javax.swing.SwingConstants;

/** What JLabel becomes; see FakeComponent. */
public class FakeLabel extends FakeComponent {
    private String text;
    private Icon icon;
    private int horizontalAlignment;
    private int verticalAlignment = SwingConstants.CENTER;
    private Component labelFor;
    private int displayedMnemonic;

    public FakeLabel() {
        this("", null, SwingConstants.LEADING);
    }

    public FakeLabel(String text) {
        this(text, null, SwingConstants.LEADING);
    }

    public FakeLabel(String text, int horizontalAlignment) {
        this(text, null, horizontalAlignment);
    }

    public FakeLabel(Icon icon) {
        this(null, icon, SwingConstants.CENTER);
    }

    public FakeLabel(Icon icon, int horizontalAlignment) {
        this(null, icon, horizontalAlignment);
    }

    public FakeLabel(String text, Icon icon, int horizontalAlignment) {
        this.text = text;
        this.icon = icon;
        this.horizontalAlignment = horizontalAlignment;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Icon getIcon() {
        return icon;
    }

    public void setIcon(Icon icon) {
        this.icon = icon;
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

    public Component getLabelFor() {
        return labelFor;
    }

    public void setLabelFor(Component component) {
        this.labelFor = component;
    }

    public int getDisplayedMnemonic() {
        return displayedMnemonic;
    }

    public void setDisplayedMnemonic(int key) {
        this.displayedMnemonic = key;
    }

    public void setDisplayedMnemonic(char key) {
        this.displayedMnemonic = Character.toUpperCase(key);
    }

    @Override
    String describe(int id) {
        String align = horizontalAlignment == SwingConstants.CENTER ? "center"
                : horizontalAlignment == SwingConstants.RIGHT || horizontalAlignment == SwingConstants.TRAILING ? "right"
                : "left";
        return "{\"id\":" + id + ",\"kind\":\"label\",\"text\":" + json(text) + ",\"align\":\"" + align
                + "\",\"visible\":" + isVisible() + "}";
    }
}
