package sivaku.swing;

import java.awt.FlowLayout;
import java.awt.LayoutManager;

/** What JPanel becomes; see FakeComponent. A panel's children are in the inherited Container. */
public class FakePanel extends FakeComponent {
    public FakePanel() {
        this(new FlowLayout(), true);
    }

    public FakePanel(LayoutManager layout) {
        this(layout, true);
    }

    public FakePanel(boolean isDoubleBuffered) {
        this(new FlowLayout(), isDoubleBuffered);
    }

    public FakePanel(LayoutManager layout, boolean isDoubleBuffered) {
        setLayout(layout);
        setOpaque(true);
    }

    @Override
    String describe(int id) {
        return "{\"id\":" + id + ",\"kind\":\"panel\",\"visible\":" + isVisible() + "}";
    }
}
