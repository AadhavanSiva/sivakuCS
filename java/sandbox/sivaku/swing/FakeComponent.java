package sivaku.swing;

import java.awt.Color;
import java.awt.Container;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.Rectangle;
import java.util.HashMap;
import java.util.Map;
import javax.swing.border.Border;

/**
 * What JComponent becomes in a student's Swing question. CheerpJ runs in a
 * Web Worker with no display, and real Swing needs AWT's toolkit, which
 * needs one; so a student's panel is loaded with JPanel, JButton, JLabel and
 * JTextField (and JComponent, AbstractButton, JTextComponent) renamed to
 * these fakes (Sandbox's Swing class loader). They extend AWT's Container,
 * which loads without a display, so add(...) and the inherited Component
 * methods keep their types. Anything that would start the toolkit (focus,
 * showing, enabling) keeps its own state here instead.
 *
 * <p>Public, with public members: the renamed classes live in another
 * class loader.
 */
public class FakeComponent extends Container {
    private boolean enabled = true;
    private boolean visible = true;
    private boolean opaque;
    private boolean focusable = true;
    private String toolTip;
    private Border border;
    private Dimension preferred;
    private Dimension minimum;
    private Dimension maximum;
    private float alignmentX = 0.5f;
    private float alignmentY = 0.5f;
    private final Map<Object, Object> clientProperties = new HashMap<>();

    public FakeComponent() {
    }

    // ---- state AWT would keep with the toolkit -----------------------------------

    @Override
    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public void setVisible(boolean visible) {
        this.visible = visible;
    }

    @Override
    public boolean isVisible() {
        return visible;
    }

    /** Never on a screen: the grader never opens a window. */
    @Override
    public boolean isShowing() {
        return false;
    }

    @Override
    public boolean isFocusOwner() {
        return false;
    }

    @Override
    public boolean hasFocus() {
        return false;
    }

    @Override
    public void requestFocus() {
    }

    @Override
    public boolean requestFocusInWindow() {
        return false;
    }

    public void grabFocus() {
    }

    @Override
    public void setFocusable(boolean focusable) {
        this.focusable = focusable;
    }

    @Override
    public boolean isFocusable() {
        return focusable;
    }

    @Override
    public void repaint() {
    }

    @Override
    public void repaint(long tm, int x, int y, int width, int height) {
    }

    public void repaint(Rectangle r) {
    }

    public void revalidate() {
    }

    @Override
    public void invalidate() {
    }

    @Override
    public void validate() {
    }

    @Override
    public void doLayout() {
    }

    public void updateUI() {
    }

    // ---- JComponent ------------------------------------------------------------

    public void setOpaque(boolean opaque) {
        this.opaque = opaque;
    }

    @Override
    public boolean isOpaque() {
        return opaque;
    }

    public void setToolTipText(String text) {
        this.toolTip = text;
    }

    public String getToolTipText() {
        return toolTip;
    }

    public void setBorder(Border border) {
        this.border = border;
    }

    public Border getBorder() {
        return border;
    }

    @Override
    public void setPreferredSize(Dimension size) {
        this.preferred = size;
    }

    @Override
    public Dimension getPreferredSize() {
        return preferred != null ? preferred : new Dimension(0, 0);
    }

    @Override
    public void setMinimumSize(Dimension size) {
        this.minimum = size;
    }

    @Override
    public Dimension getMinimumSize() {
        return minimum != null ? minimum : new Dimension(0, 0);
    }

    @Override
    public void setMaximumSize(Dimension size) {
        this.maximum = size;
    }

    @Override
    public Dimension getMaximumSize() {
        return maximum != null ? maximum : new Dimension(Short.MAX_VALUE, Short.MAX_VALUE);
    }

    public void setAlignmentX(float alignment) {
        this.alignmentX = alignment;
    }

    @Override
    public float getAlignmentX() {
        return alignmentX;
    }

    public void setAlignmentY(float alignment) {
        this.alignmentY = alignment;
    }

    @Override
    public float getAlignmentY() {
        return alignmentY;
    }

    public final void putClientProperty(Object key, Object value) {
        if (value == null) {
            clientProperties.remove(key);
        } else {
            clientProperties.put(key, value);
        }
    }

    public final Object getClientProperty(Object key) {
        return clientProperties.get(key);
    }

    @Override
    public void setFont(Font font) {
        super.setFont(font);
    }

    @Override
    public void setForeground(Color color) {
        super.setForeground(color);
    }

    @Override
    public void setBackground(Color color) {
        super.setBackground(color);
    }

    // ---- for Run: drawing the panel as HTML -------------------------------------

    /** This component as JSON for the page, without children; ids are assigned by SwingHost. */
    String describe(int id) {
        return "{\"id\":" + id + ",\"kind\":\"component\",\"visible\":" + visible + "}";
    }

    static String json(String s) {
        if (s == null) {
            return "null";
        }
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> b.append("\\\"");
                case '\\' -> b.append("\\\\");
                case '\n' -> b.append("\\n");
                case '\r' -> b.append("\\r");
                case '\t' -> b.append("\\t");
                default -> {
                    if (c < 0x20) {
                        b.append(String.format("\\u%04x", (int) c));
                    } else {
                        b.append(c);
                    }
                }
            }
        }
        return b.append('"').toString();
    }
}
