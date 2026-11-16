import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

/**
 * Midterm 3 proof 4b: Swing listener questions without Swing. The student's
 * panel classes (args[0], compiled against real Swing) are loaded through a
 * class loader that renames JPanel, JButton, JLabel and JTextField to the
 * fakes in this folder; the grader then clicks, types and reads labels
 * through the panel's fields, as it would with real Swing. Prints one JSON
 * object on standard output.
 */
public class SwingFallbackProof {
    static final Map<String, String> RENAMES = Map.of(
            "javax/swing/JPanel", "FakePanel",
            "javax/swing/JButton", "FakeButton",
            "javax/swing/JLabel", "FakeLabel",
            "javax/swing/JTextField", "FakeTextField");

    /** Loads the student's classes itself, renamed; everything else from its parent. */
    static final class RenamingLoader extends ClassLoader {
        private final Path dir;
        final int[] renamed = {0};

        RenamingLoader(Path dir, ClassLoader parent) {
            super(parent);
            this.dir = dir;
        }

        @Override
        protected synchronized Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
            Path file = dir.resolve(name.replace('.', '/') + ".class");
            if (!Files.exists(file)) {
                return super.loadClass(name, resolve);
            }
            Class<?> loaded = findLoadedClass(name);
            if (loaded == null) {
                try {
                    byte[] bytes = Renamer.rename(Files.readAllBytes(file), RENAMES, renamed);
                    loaded = defineClass(name, bytes, 0, bytes.length);
                } catch (IOException e) {
                    throw new ClassNotFoundException(name, e);
                }
            }
            if (resolve) {
                resolveClass(loaded);
            }
            return loaded;
        }
    }

    static Object field(Object panel, String name) throws ReflectiveOperationException {
        Field f = panel.getClass().getField(name);
        return f.get(panel);
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            // The sandbox passes no arguments; the browser test sends them as lines of input.
            args = new String(System.in.readAllBytes()).trim().split("\\R");
        }
        long start = System.nanoTime();
        RenamingLoader loader = new RenamingLoader(Path.of(args[0]), SwingFallbackProof.class.getClassLoader());
        Class<?> counterClass = loader.loadClass("CounterPanel");
        Object a = counterClass.getConstructor().newInstance();
        Object b = counterClass.getConstructor().newInstance();
        long firstPanelMs = (System.nanoTime() - start) / 1_000_000;

        start = System.nanoTime();
        FakeButton addA = (FakeButton) field(a, "add");
        addA.doClick();
        addA.doClick();
        addA.doClick();
        String afterThree = ((FakeLabel) field(a, "label")).getText();
        ((FakeButton) field(b, "add")).doClick();
        String otherPanel = ((FakeLabel) field(b, "label")).getText();
        ((FakeButton) field(a, "reset")).doClick();
        String afterReset = ((FakeLabel) field(a, "label")).getText();
        long clicksMs = (System.nanoTime() - start) / 1_000_000;

        Object p = loader.loadClass("PricePanel").getConstructor().newInstance();
        FakeTextField hours = (FakeTextField) field(p, "hours");
        FakeButton price = (FakeButton) field(p, "price");
        FakeLabel label = (FakeLabel) field(p, "label");
        String initial = label.getText();
        hours.setText(" 3 ");
        price.doClick();
        String priced = label.getText();
        hours.setText("three");
        price.doClick();
        String notNumber = label.getText();
        hours.setText("-1");
        price.doClick();
        String negative = label.getText();
        price.setEnabled(false);
        hours.setText("4");
        price.doClick();
        String whileDisabled = label.getText();

        System.out.println("{\"works\":true,\"renamedConstants\":" + loader.renamed[0]
                + ",\"superclass\":" + json(counterClass.getSuperclass().getName())
                + ",\"counter\":{\"afterThreeClicks\":" + json(afterThree)
                + ",\"otherPanelAfterOneClick\":" + json(otherPanel) + ",\"afterReset\":" + json(afterReset)
                + ",\"firstPanelMs\":" + firstPanelMs + ",\"fiveClicksMs\":" + clicksMs + "}"
                + ",\"price\":{\"initial\":" + json(initial) + ",\"after3\":" + json(priced)
                + ",\"afterThree\":" + json(notNumber) + ",\"afterMinus1\":" + json(negative)
                + ",\"clickWhileDisabled\":" + json(whileDisabled) + "}}");
    }

    static String json(String s) {
        return s == null ? "null" : "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }
}
