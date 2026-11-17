package sivaku.sandbox;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLClassLoader;
import java.util.Map;

/**
 * The class loader for one run: the run's own compiled classes (the
 * student's, the given files, a harness), over the sandbox's.
 *
 * <p>For a Swing question it loads those classes itself, with JPanel,
 * JButton, JLabel, JTextField and their supertypes renamed to the fakes in
 * sivaku.swing: CheerpJ runs in a Web Worker with no display, so real Swing
 * cannot start there (proved in java/proofs/m3/swing).
 */
final class RunLoader extends URLClassLoader {
    static final Map<String, String> SWING = Map.of(
            "javax/swing/JPanel", "sivaku/swing/FakePanel",
            "javax/swing/JButton", "sivaku/swing/FakeButton",
            "javax/swing/AbstractButton", "sivaku/swing/FakeButton",
            "javax/swing/JLabel", "sivaku/swing/FakeLabel",
            "javax/swing/JTextField", "sivaku/swing/FakeTextField",
            "javax/swing/text/JTextComponent", "sivaku/swing/FakeTextField",
            "javax/swing/JComponent", "sivaku/swing/FakeComponent");

    private final boolean swing;

    static {
        registerAsParallelCapable();
    }

    RunLoader(URL[] urls, ClassLoader parent, boolean swing) {
        super(urls, parent);
        this.swing = swing;
    }

    /**
     * JUnit's packages, which the sandbox carries a small stand-in for. When
     * the run's own class path has the real ones (a JUnit jar), those win:
     * real JUnit cannot find tests through the stand-in's annotations.
     */
    private static boolean junit(String name) {
        return name.startsWith("org.junit.") || name.startsWith("org.opentest4j.");
    }

    @Override
    protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
        if (junit(name) && findResource(name.replace('.', '/') + ".class") != null) {
            synchronized (getClassLoadingLock(name)) {
                Class<?> loaded = findLoadedClass(name);
                if (loaded == null) {
                    loaded = findClass(name);
                }
                if (resolve) {
                    resolveClass(loaded);
                }
                return loaded;
            }
        }
        if (!swing) {
            return super.loadClass(name, resolve);
        }
        synchronized (getClassLoadingLock(name)) {
            Class<?> loaded = findLoadedClass(name);
            if (loaded == null) {
                URL file = findResource(name.replace('.', '/') + ".class");
                if (file == null) {
                    return super.loadClass(name, resolve);
                }
                try (InputStream in = file.openStream()) {
                    byte[] bytes = Renamer.rename(in.readAllBytes(), SWING);
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

    /**
     * Whether a stack frame's class is one of this run's own (student, given,
     * harness), rather than the JDK's, CheerpJ's or the sandbox's. Lambdas and
     * hidden classes count as the class that made them.
     */
    boolean isOwn(String className) {
        String name = className;
        int lambda = name.indexOf("$$");
        if (lambda > 0) {
            name = name.substring(0, lambda);
        }
        int hidden = name.indexOf('/');
        if (hidden > 0) {
            name = name.substring(0, hidden);
        }
        return findResource(name.replace('.', '/') + ".class") != null;
    }
}
