package sivaku.sandbox;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassModel;
import java.lang.classfile.ClassTransform;
import java.lang.classfile.CodeTransform;
import java.lang.classfile.Opcode;
import java.lang.classfile.instruction.InvokeInstruction;
import java.lang.constant.ClassDesc;
import java.lang.constant.ConstantDescs;
import java.lang.constant.MethodTypeDesc;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;
import javax.tools.JavaCompiler;
import javax.tools.ToolProvider;

/**
 * Compiles and runs a student's program inside the browser JVM (CheerpJ).
 *
 * <p>JavaScript calls these static methods through cheerpjRunLibrary. Every
 * method takes and returns plain Strings, so nothing depends on how CheerpJ
 * converts arrays or objects between the two languages; structured results
 * come back as JSON.
 */
public final class Sandbox {

    /** Each captured stream keeps at most this much; the rest is dropped and flagged. */
    private static final int MAX_CAPTURE = 1 << 20;

    // Installed once and never replaced. Library code that holds on to
    // System.in or System.out (java.lang.IO, a Scanner in a static field)
    // keeps working because only what sits behind these streams changes
    // from run to run.
    private static final SwitchableInput STDIN = new SwitchableInput();
    private static final SwitchableOutput STDOUT = new SwitchableOutput();
    private static final SwitchableOutput STDERR = new SwitchableOutput();

    static {
        System.setIn(STDIN);
        System.setOut(new PrintStream(STDOUT, true, StandardCharsets.UTF_8));
        System.setErr(new PrintStream(STDERR, true, StandardCharsets.UTF_8));
    }

    private Sandbox() {
    }

    /** What the runtime supports, for the page to display and the tests to check. */
    public static String info() {
        boolean hasIo;
        try {
            Class.forName("java.lang.IO");
            hasIo = true;
        } catch (ClassNotFoundException e) {
            hasIo = false;
        }
        return "{\"javaVersion\":" + json(Runtime.version().toString())
                + ",\"vendor\":" + json(System.getProperty("java.vendor"))
                + ",\"userDir\":" + json(System.getProperty("user.dir"))
                + ",\"cwd\":" + json(Path.of("").toAbsolutePath().toString())
                + ",\"hasJavaLangIO\":" + hasIo
                + ",\"hasCompiler\":" + (ToolProvider.getSystemJavaCompiler() != null)
                + "}";
    }

    /** Deletes a directory tree if it exists and recreates it empty. */
    public static void reset(String dir) throws IOException {
        Path root = Path.of(dir);
        if (Files.exists(root)) {
            deleteTree(root);
        }
        Files.createDirectories(root);
    }

    /**
     * Empties a directory except for one top-level entry, which is where the
     * sandbox keeps its own sources and classes inside the program's
     * working directory.
     */
    public static void clearExcept(String dir, String keep) throws IOException {
        Path root = Path.of(dir);
        Files.createDirectories(root);
        try (Stream<Path> children = Files.list(root)) {
            for (Path child : children.toList()) {
                if (!child.getFileName().toString().equals(keep)) {
                    deleteTree(child);
                }
            }
        }
    }

    private static void deleteTree(Path path) throws IOException {
        try (Stream<Path> walk = Files.walk(path)) {
            for (Path p : walk.sorted(Comparator.reverseOrder()).toList()) {
                Files.delete(p);
            }
        }
    }

    public static void writeFile(String path, String content) throws IOException {
        Path p = Path.of(path);
        if (p.getParent() != null) {
            Files.createDirectories(p.getParent());
        }
        Files.writeString(p, content, StandardCharsets.UTF_8);
    }

    /** A file's text, or null if it does not exist. */
    public static String readFile(String path) throws IOException {
        Path p = Path.of(path);
        return Files.isRegularFile(p) ? Files.readString(p, StandardCharsets.UTF_8) : null;
    }

    /**
     * Every file under a directory, as JSON {"relative/path": "contents"},
     * leaving out one top-level entry (the sandbox's own directory).
     */
    public static String readTree(String dir, String exclude) throws IOException {
        Path root = Path.of(dir);
        Path skip = root.resolve(exclude);
        StringBuilder out = new StringBuilder("{");
        if (Files.isDirectory(root)) {
            try (Stream<Path> walk = Files.walk(root)) {
                List<Path> files = walk.filter(p -> !p.startsWith(skip))
                        .filter(Files::isRegularFile).sorted().toList();
                for (int i = 0; i < files.size(); i++) {
                    Path f = files.get(i);
                    String rel = root.relativize(f).toString().replace('\\', '/');
                    out.append(i == 0 ? "" : ",").append(json(rel)).append(':')
                            .append(json(Files.readString(f, StandardCharsets.UTF_8)));
                }
            }
        }
        return out.append('}').toString();
    }

    /**
     * Compiles every .java file under srcDir into outDir.
     *
     * @return JSON {"ok": bool, "output": "javac's own messages", "ms": n}.
     *     Paths in the messages are relative to srcDir, so an error reads
     *     "Main.java:3: error: ..." as it does on a student's own machine.
     */
    public static String compile(String srcDir, String outDir) throws IOException {
        return compileWith(srcDir, outDir, "");
    }

    /**
     * Like {@link #compile}, with a classpath for code the sources use but
     * that is not among them: the student's compiled classes and the
     * {@code sivaku.harness} helpers, when compiling a hidden test harness.
     * Entries are separated by {@link File#pathSeparator}. (A separate name
     * rather than an overload: CheerpJ's library mode resolves overloads
     * unreliably.)
     */
    public static String compileWith(String srcDir, String outDir, String classPath) throws IOException {
        long start = System.nanoTime();
        JavaCompiler javac = ToolProvider.getSystemJavaCompiler();
        if (javac == null) {
            return "{\"ok\":false,\"output\":" + json("This Java runtime has no compiler.") + ",\"ms\":0}";
        }
        Path src = Path.of(srcDir);
        List<String> args = new ArrayList<>(List.of(
                "-d", outDir, "-encoding", "UTF-8", "-proc:none", "-g"));
        if (!classPath.isEmpty()) {
            args.add("-classpath");
            args.add(classPath);
        }
        try (Stream<Path> walk = Files.walk(src)) {
            walk.filter(p -> p.toString().endsWith(".java")).sorted()
                    .forEach(p -> args.add(p.toString()));
        }
        ByteArrayOutputStream messages = new ByteArrayOutputStream();
        int code = javac.run(null, messages, messages, args.toArray(String[]::new));
        String output = messages.toString(StandardCharsets.UTF_8)
                .replace(src.toString() + "/", "")
                .replace(src.toString() + "\\", "");
        if (code == 0) {
            redirectExits(Path.of(outDir));
        }
        long ms = (System.nanoTime() - start) / 1_000_000;
        return "{\"ok\":" + (code == 0) + ",\"output\":" + json(output) + ",\"ms\":" + ms + "}";
    }

    private static final ClassDesc SYSTEM = ClassDesc.of("java.lang.System");
    private static final ClassDesc RUNTIME = ClassDesc.of("java.lang.Runtime");
    private static final ClassDesc SANDBOX = ClassDesc.of("sivaku.sandbox.Sandbox");
    private static final MethodTypeDesc INT_TO_VOID = MethodTypeDesc.of(ConstantDescs.CD_void, ConstantDescs.CD_int);

    /**
     * Rewrites System.exit, Runtime.exit and Runtime.halt in the compiled
     * classes to throw an {@link ExitSignal} instead.
     *
     * <p>In CheerpJ a real System.exit ends the whole JVM in the worker, so
     * the run never reports back and every later call fails. Rewriting the
     * bytecode (rather than the source) keeps line numbers and string
     * literals exactly as the student wrote them.
     */
    private static void redirectExits(Path classesDir) throws IOException {
        ClassFile cf = ClassFile.of();
        List<Path> classFiles;
        try (Stream<Path> walk = Files.walk(classesDir)) {
            classFiles = walk.filter(p -> p.toString().endsWith(".class")).toList();
        }
        for (Path file : classFiles) {
            ClassModel model = cf.parse(Files.readAllBytes(file));
            boolean[] changed = {false};
            CodeTransform exits = (code, element) -> {
                if (element instanceof InvokeInstruction call && call.typeSymbol().equals(INT_TO_VOID)) {
                    ClassDesc owner = call.owner().asSymbol();
                    String name = call.name().stringValue();
                    if (owner.equals(SYSTEM) && name.equals("exit") && call.opcode() == Opcode.INVOKESTATIC) {
                        code.invokestatic(SANDBOX, "exit", INT_TO_VOID);
                        changed[0] = true;
                        return;
                    }
                    if (owner.equals(RUNTIME) && (name.equals("exit") || name.equals("halt"))
                            && call.opcode() == Opcode.INVOKEVIRTUAL) {
                        // The Runtime instance is still on the stack below the status.
                        code.invokestatic(SANDBOX, "runtimeExit",
                                MethodTypeDesc.of(ConstantDescs.CD_void, RUNTIME, ConstantDescs.CD_int));
                        changed[0] = true;
                        return;
                    }
                }
                code.with(element);
            };
            byte[] rewritten = cf.transformClass(model, ClassTransform.transformingMethodBodies(exits));
            if (changed[0]) {
                Files.write(file, rewritten);
            }
        }
    }

    /** What a student's System.exit(status) becomes. Not for any other use. */
    public static void exit(int status) {
        throw new ExitSignal(status);
    }

    /** What a student's Runtime.getRuntime().exit(status) or halt(status) becomes. */
    public static void runtimeExit(Runtime runtime, int status) {
        throw new ExitSignal(status);
    }

    /**
     * Thrown in place of exiting the JVM. An Error rather than an Exception,
     * so a student's catch (Exception e) does not swallow it.
     */
    static final class ExitSignal extends Error {
        final int status;

        ExitSignal(int status) {
            super("System.exit(" + status + ")", null, false, false);
            this.status = status;
        }
    }

    /**
     * Runs mainClass with the given standard input.
     *
     * <p>Follows the Java 25 launch protocol: a static main(String[]) or
     * main(), or else an instance main on a new object of the class. A fresh
     * class loader per run means static fields start over each time.
     *
     * @param classPath directories of compiled classes, separated by
     *     {@link File#pathSeparator}
     * @return JSON {"exitCode", "stdout", "stderr", "stdoutTruncated",
     *     "stderrTruncated", "ms"}.
     */
    public static String run(String classPath, String mainClass, String stdin) throws IOException {
        Capture out = new Capture();
        Capture err = new Capture();
        int exitCode = 0;
        long start = System.nanoTime();
        try (URLClassLoader loader = open(classPath, stdin, out, err)) {
            launch(loader.loadClass(mainClass));
        } catch (InvocationTargetException e) {
            if (e.getCause() instanceof ExitSignal exit) {
                exitCode = exit.status;
            } else {
                exitCode = 1;
                reportUncaught(e.getCause());
            }
        } catch (ClassNotFoundException e) {
            exitCode = 1;
            System.err.println("Error: Could not find or load main class " + mainClass);
        } catch (NoSuchMethodException e) {
            exitCode = 1;
            System.err.println("Error: Main method not found in class " + mainClass
                    + ", please define the main method as:\n   public static void main(String[] args)");
        } catch (ReflectiveOperationException e) {
            exitCode = 1;
            reportUncaught(e);
        } finally {
            close();
        }
        long ms = (System.nanoTime() - start) / 1_000_000;
        return "{\"exitCode\":" + exitCode
                + ",\"stdout\":" + json(out.text())
                + ",\"stderr\":" + json(err.text())
                + ",\"stdoutTruncated\":" + out.truncated
                + ",\"stderrTruncated\":" + err.truncated
                + ",\"ms\":" + ms + "}";
    }

    /**
     * Runs one case of a hidden test harness: the public static no-argument
     * method {@code method} of {@code harnessClass}. The case passes if it
     * returns, and fails if it throws; a {@code sivaku.harness.Check} failure
     * gives the reason shown to the student, such as
     * "describe a student ==> expected: <x> but was: <y>".
     *
     * @return JSON {"passed", "reason", "stdout", "stderr", "ms"}; reason is
     *     null when the case passed.
     */
    public static String callHarness(String classPath, String harnessClass, String method) throws IOException {
        Capture out = new Capture();
        Capture err = new Capture();
        String reason = null;
        long start = System.nanoTime();
        try (URLClassLoader loader = open(classPath, "", out, err)) {
            Method test = loader.loadClass(harnessClass).getMethod(method);
            if (!Modifier.isStatic(test.getModifiers())) {
                throw new NoSuchMethodException(harnessClass + "." + method + " is not static");
            }
            test.invoke(null);
        } catch (InvocationTargetException e) {
            reason = describeFailure(e.getCause());
        } catch (ReflectiveOperationException | LinkageError e) {
            // The harness itself is broken, or could not link against the
            // student's classes (a method the student renamed, say).
            reason = describeFailure(e);
        } finally {
            close();
        }
        long ms = (System.nanoTime() - start) / 1_000_000;
        return "{\"passed\":" + (reason == null)
                + ",\"reason\":" + json(reason)
                + ",\"stdout\":" + json(out.text())
                + ",\"stderr\":" + json(err.text())
                + ",\"ms\":" + ms + "}";
    }

    /** What a student sees when a harness case fails, in the style of JUnit's messages. */
    private static String describeFailure(Throwable t) {
        if (t instanceof ExitSignal exit) {
            return "Your code called System.exit(" + exit.status + ")";
        }
        if (t instanceof AssertionError && t.getMessage() != null) {
            return t.getMessage();
        }
        if (t instanceof NoSuchMethodError || t instanceof NoSuchFieldError || t instanceof NoClassDefFoundError) {
            return "Could not use your code: " + t;
        }
        String message = t.getMessage();
        return "Unexpected exception thrown: " + t.getClass().getName() + (message == null ? "" : ": " + message);
    }

    /** Points the shared streams at this run's input and capture, and opens its class loader. */
    private static URLClassLoader open(String classPath, String stdin, Capture out, Capture err) throws IOException {
        STDIN.use(new ByteArrayInputStream(stdin.getBytes(StandardCharsets.UTF_8)));
        STDOUT.use(out);
        STDERR.use(err);
        List<URL> urls = new ArrayList<>();
        for (String entry : classPath.split(java.util.regex.Pattern.quote(File.pathSeparator))) {
            if (!entry.isEmpty()) {
                urls.add(Path.of(entry).toUri().toURL());
            }
        }
        URLClassLoader loader = new URLClassLoader(urls.toArray(URL[]::new), Sandbox.class.getClassLoader());
        Thread.currentThread().setContextClassLoader(loader);
        return loader;
    }

    /** Flushes and disconnects the shared streams after a run. */
    private static void close() {
        System.out.flush();
        System.err.flush();
        Thread.currentThread().setContextClassLoader(Sandbox.class.getClassLoader());
        STDIN.use(InputStream.nullInputStream());
        STDOUT.use(OutputStream.nullOutputStream());
        STDERR.use(OutputStream.nullOutputStream());
    }

    private static void launch(Class<?> type) throws ReflectiveOperationException {
        Method main = findMain(type, true);
        if (main == null) {
            main = findMain(type, false);
        }
        if (main == null) {
            throw new NoSuchMethodException("main");
        }
        main.setAccessible(true);
        Object[] args = main.getParameterCount() == 1 ? new Object[] {new String[0]} : new Object[0];
        Object target = null;
        if (!Modifier.isStatic(main.getModifiers())) {
            Constructor<?> ctor = type.getDeclaredConstructor();
            ctor.setAccessible(true);
            target = ctor.newInstance();
        }
        main.invoke(target, args);
    }

    /** The first non-private main(String[]) (or main()) up the class hierarchy. */
    private static Method findMain(Class<?> type, boolean withArgs) {
        for (Class<?> c = type; c != null && c != Object.class; c = c.getSuperclass()) {
            try {
                Method m = withArgs ? c.getDeclaredMethod("main", String[].class) : c.getDeclaredMethod("main");
                if (!Modifier.isPrivate(m.getModifiers()) && m.getReturnType() == void.class) {
                    return m;
                }
            } catch (NoSuchMethodException ignored) {
                // keep looking in the superclass
            }
        }
        return null;
    }

    /** Prints an uncaught exception the way the java launcher does, without the sandbox's own frames. */
    private static void reportUncaught(Throwable t) {
        trim(t);
        StringWriter text = new StringWriter();
        t.printStackTrace(new PrintWriter(text));
        System.err.print("Exception in thread \"main\" " + text);
    }

    private static void trim(Throwable t) {
        for (Throwable x = t; x != null; x = x.getCause()) {
            StackTraceElement[] frames = x.getStackTrace();
            int keep = frames.length;
            for (int i = 0; i < frames.length; i++) {
                String cls = frames[i].getClassName();
                // CheerpJ reaches main through method handles, so its frames
                // are java.lang.invoke ones rather than reflection.
                if (cls.startsWith("java.lang.reflect.") || cls.startsWith("jdk.internal.reflect.")
                        || cls.startsWith("java.lang.invoke.") || cls.startsWith("sivaku.sandbox.")) {
                    keep = i;
                    break;
                }
            }
            x.setStackTrace(java.util.Arrays.copyOf(frames, keep));
        }
    }

    static String json(String s) {
        if (s == null) {
            return "null";
        }
        StringBuilder b = new StringBuilder(s.length() + 2).append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
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

    /** Collects a run's output up to MAX_CAPTURE bytes, so a print loop cannot exhaust memory. */
    private static final class Capture extends OutputStream {
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private boolean truncated;

        @Override
        public synchronized void write(int b) {
            if (bytes.size() < MAX_CAPTURE) {
                bytes.write(b);
            } else {
                truncated = true;
            }
        }

        @Override
        public synchronized void write(byte[] b, int off, int len) {
            int room = MAX_CAPTURE - bytes.size();
            if (len > room) {
                truncated = true;
                len = Math.max(room, 0);
            }
            bytes.write(b, off, len);
        }

        synchronized String text() {
            return bytes.toString(StandardCharsets.UTF_8);
        }
    }

    private static final class SwitchableInput extends InputStream {
        private volatile InputStream target = InputStream.nullInputStream();

        void use(InputStream in) {
            target = in;
        }

        @Override
        public int read() throws IOException {
            return target.read();
        }

        @Override
        public int read(byte[] b, int off, int len) throws IOException {
            return target.read(b, off, len);
        }

        @Override
        public int available() throws IOException {
            return target.available();
        }
    }

    private static final class SwitchableOutput extends OutputStream {
        private volatile OutputStream target = OutputStream.nullOutputStream();

        void use(OutputStream out) {
            target = out;
        }

        @Override
        public void write(int b) throws IOException {
            target.write(b);
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            target.write(b, off, len);
        }

        @Override
        public void flush() throws IOException {
            target.flush();
        }
    }
}
