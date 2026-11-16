import java.awt.Container;
import java.awt.LayoutManager;

/**
 * What JPanel becomes in a student's panel class when real Swing cannot
 * start (CheerpJ in a Web Worker has no display, and Swing's look and feel
 * needs one). AWT's Container loads without a display, so add(...) keeps
 * its types. Public, because the rewritten class is in another class loader.
 */
public class FakePanel extends Container {
    public FakePanel() {
    }

    public FakePanel(LayoutManager layout) {
        setLayout(layout);
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
