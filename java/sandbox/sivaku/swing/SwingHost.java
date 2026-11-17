package sivaku.swing;

import java.awt.Component;
import java.util.ArrayList;
import java.util.List;

/**
 * Run for a Swing question: the student's panel, drawn by the page as plain
 * HTML. {@link #render} describes the component tree as JSON, numbering the
 * components in order; the page sends back events naming those numbers:
 *
 * <pre>
 *   click 3          press button 3
 *   enter 2          press Enter in text field 2
 *   text 2 hello     text field 2 now holds "hello" (the rest of the line)
 * </pre>
 */
public final class SwingHost {
    private final FakeComponent root;
    private final List<Component> numbered = new ArrayList<>();

    public SwingHost(FakeComponent root) {
        this.root = root;
    }

    /** The tree as JSON: {"id", "kind", ..., "children": [...]} for each component. */
    public String render() {
        numbered.clear();
        return describe(root);
    }

    private String describe(Component c) {
        int id = numbered.size();
        numbered.add(c);
        String self = c instanceof FakeComponent f ? f.describe(id)
                : "{\"id\":" + id + ",\"kind\":\"other\",\"name\":" + FakeComponent.json(c.getClass().getSimpleName()) + "}";
        if (!(c instanceof FakePanel panel) || panel.getComponentCount() == 0) {
            return self;
        }
        StringBuilder children = new StringBuilder();
        for (Component child : panel.getComponents()) {
            children.append(children.length() == 0 ? "" : ",").append(describe(child));
        }
        return self.substring(0, self.length() - 1) + ",\"children\":[" + children + "]}";
    }

    /** Applies one event line from the page; returns false for one it does not understand. */
    public boolean apply(String event) {
        String[] parts = event.split(" ", 3);
        if (parts.length < 2) {
            return false;
        }
        Component target;
        try {
            target = numbered.get(Integer.parseInt(parts[1]));
        } catch (RuntimeException e) {
            return false;
        }
        switch (parts[0]) {
            case "click" -> {
                if (target instanceof FakeButton button) {
                    button.doClick(0);
                    return true;
                }
            }
            case "enter" -> {
                if (target instanceof FakeTextField field && field.isEnabled()) {
                    field.postActionEvent();
                    return true;
                }
            }
            case "text" -> {
                if (target instanceof FakeTextField field && field.isEnabled() && field.isEditable()) {
                    field.setText(parts.length > 2 ? parts[2] : "");
                    return true;
                }
            }
            default -> {
                return false;
            }
        }
        return false;
    }
}
