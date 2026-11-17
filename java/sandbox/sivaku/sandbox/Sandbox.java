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
import java.lang.classfile.ClassHierarchyResolver;
import java.lang.classfile.ClassModel;
import java.lang.classfile.ClassTransform;
import java.lang.classfile.CodeTransform;
import java.lang.classfile.Opcode;
import java.lang.classfile.instruction.InvokeInstruction;
import java.lang.classfile.instruction.NewObjectInstruction;
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
import java.nio.file.FileSystemException;
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
                delete(p);
            }
        }
    }

    /**
     * Deletes one file. On Windows a file that a student's program left open
     * (a PrintWriter never closed) cannot be deleted until its stream is
     * garbage collected, so collect and try again a few times.
     */
    private static void delete(Path p) throws IOException {
        for (int attempt = 0; ; attempt++) {
            try {
                Files.deleteIfExists(p);
                return;
            } catch (FileSystemException e) {
                if (attempt == 10) {
                    throw e;
                }
                System.gc();
                try {
                    Thread.sleep(20);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw e;
                }
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
            rewriteClasses(Path.of(outDir));
        }
        long ms = (System.nanoTime() - start) / 1_000_000;
        return "{\"ok\":" + (code == 0) + ",\"output\":" + json(output) + ",\"ms\":" + ms + "}";
    }

    private static final ClassDesc SYSTEM = ClassDesc.of("java.lang.System");
    private static final ClassDesc RUNTIME = ClassDesc.of("java.lang.Runtime");
    private static final ClassDesc SANDBOX = ClassDesc.of("sivaku.sandbox.Sandbox");
    private static final MethodTypeDesc INT_TO_VOID = MethodTypeDesc.of(ConstantDescs.CD_void, ConstantDescs.CD_int);
    private static final ClassDesc SOCKET = ClassDesc.of("java.net.Socket");
    private static final ClassDesc SERVER_SOCKET = ClassDesc.of("java.net.ServerSocket");
    private static final ClassDesc FAKE_SOCKET = ClassDesc.of("sivaku.net.FakeSocket");
    private static final ClassDesc FAKE_SERVER_SOCKET = ClassDesc.of("sivaku.net.FakeServerSocket");

    /** The fake a created socket class becomes, or null. */
    private static ClassDesc fakeFor(ClassDesc type) {
        if (type.equals(SOCKET)) {
            return FAKE_SOCKET;
        }
        if (type.equals(SERVER_SOCKET)) {
            return FAKE_SERVER_SOCKET;
        }
        return null;
    }

    /**
     * Rewrites the compiled classes (Rewriting the bytecode rather than the
     * source keeps line numbers and string literals exactly as the student
     * wrote them):
     *
     * <ul>
     *   <li>System.exit, Runtime.exit and Runtime.halt throw an
     *       {@link ExitSignal} instead. In CheerpJ a real System.exit ends the
     *       whole JVM in the worker, so the run never reports back and every
     *       later call fails.</li>
     *   <li>{@code new Socket(...)} and {@code new ServerSocket(...)} create
     *       {@link sivaku.net.FakeSocket} and {@link sivaku.net.FakeServerSocket},
     *       subclasses on an in-memory network: real sockets cannot work in
     *       CheerpJ (java/proofs/m3/sockets). Every compile is rewritten, the
     *       student's, the given files' and the hidden tests', so all of them
     *       meet on the same simulated network, on the JDK as in the browser.</li>
     * </ul>
     */
    private static void rewriteClasses(Path classesDir) throws IOException {
        // Stack maps are regenerated, which needs the class hierarchy: the
        // JDK's, the sandbox's (the fakes) and the classes just compiled.
        ClassFile cf = ClassFile.of(ClassFile.ClassHierarchyResolverOption.of(
                ClassHierarchyResolver.defaultResolver()
                        .orElse(ClassHierarchyResolver.ofResourceParsing(Sandbox.class.getClassLoader()))
                        .orElse(ClassHierarchyResolver.ofResourceParsing(desc -> {
                            String internal = desc.descriptorString();
                            Path file = classesDir.resolve(internal.substring(1, internal.length() - 1) + ".class");
                            try {
                                return Files.exists(file) ? Files.newInputStream(file) : null;
                            } catch (IOException e) {
                                return null;
                            }
                        }))));
        List<Path> classFiles;
        try (Stream<Path> walk = Files.walk(classesDir)) {
            classFiles = walk.filter(p -> p.toString().endsWith(".class")).toList();
        }
        for (Path file : classFiles) {
            ClassModel model = cf.parse(Files.readAllBytes(file));
            boolean[] changed = {false};
            CodeTransform exits = (code, element) -> {
                if (element instanceof NewObjectInstruction created) {
                    ClassDesc fake = fakeFor(created.className().asSymbol());
                    if (fake != null) {
                        code.new_(fake);
                        changed[0] = true;
                        return;
                    }
                }
                if (element instanceof InvokeInstruction call && call.opcode() == Opcode.INVOKESPECIAL
                        && call.name().equalsString("<init>") && !model.thisClass().asSymbol().equals(FAKE_SOCKET)) {
                    // The constructor call that goes with a rewritten new. (A
                    // class extending Socket itself is left alone.)
                    ClassDesc fake = fakeFor(call.owner().asSymbol());
                    boolean superCall = model.superclass().map(c -> c.asSymbol().equals(call.owner().asSymbol())).orElse(false);
                    if (fake != null && !superCall) {
                        code.invokespecial(fake, "<init>", call.typeSymbol());
                        changed[0] = true;
                        return;
                    }
                }
                if (element instanceof InvokeInstruction call && call.opcode() == Opcode.INVOKEVIRTUAL
                        && isThrowable(call.owner().asInternalName(), classesDir, cf)) {
                    // e.printStackTrace() and e.getStackTrace() go through
                    // guards that never read the stack trace of an exception
                    // the runtime threw itself (see thrownByRuntime).
                    String name = call.name().stringValue();
                    MethodTypeDesc type = call.typeSymbol();
                    if (name.equals("printStackTrace") || name.equals("getStackTrace")) {
                        MethodTypeDesc guard = type.insertParameterTypes(0, ConstantDescs.CD_Throwable);
                        String target = name.equals("printStackTrace") ? "printStackTraceOf" : "stackTraceOf";
                        if (GUARDED.contains(target + guard.descriptorString())) {
                            code.invokestatic(SANDBOX, target, guard);
                            changed[0] = true;
                            return;
                        }
                    }
                }
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

    /** The guards e.printStackTrace(...) and e.getStackTrace() calls are rewritten to, by name and descriptor. */
    private static final java.util.Set<String> GUARDED = java.util.Set.of(
            "printStackTraceOf(Ljava/lang/Throwable;)V",
            "printStackTraceOf(Ljava/lang/Throwable;Ljava/io/PrintStream;)V",
            "printStackTraceOf(Ljava/lang/Throwable;Ljava/io/PrintWriter;)V",
            "stackTraceOf(Ljava/lang/Throwable;)[Ljava/lang/StackTraceElement;");

    /**
     * Whether a class is Throwable or extends it: a class just compiled is
     * read from its class file (a student's own exception, whatever its
     * name), any other is looked up without initialising it.
     */
    private static boolean isThrowable(String internalName, Path classesDir, ClassFile cf) {
        for (String name = internalName; name != null; ) {
            if (name.equals("java/lang/Throwable")) {
                return true;
            }
            Path file = classesDir.resolve(name + ".class");
            if (!Files.exists(file)) {
                try {
                    Class<?> known = Class.forName(name.replace('/', '.'), false, Sandbox.class.getClassLoader());
                    return Throwable.class.isAssignableFrom(known);
                } catch (ClassNotFoundException | LinkageError e) {
                    return false;
                }
            }
            try {
                name = cf.parse(Files.readAllBytes(file)).superclass().map(c -> c.asInternalName()).orElse(null);
            } catch (IOException | IllegalArgumentException e) {
                return false;
            }
        }
        return false;
    }

    /** What e.printStackTrace() becomes. */
    public static void printStackTraceOf(Throwable t) {
        printStackTraceOf(t, System.err);
    }

    /**
     * What e.printStackTrace(stream) becomes: Java's own output, without the
     * sandbox's frames below main (as the java launcher shows it). An
     * exception the runtime threw itself prints only its first line.
     */
    public static void printStackTraceOf(Throwable t, PrintStream stream) {
        if (thrownByRuntime(t)) {
            stream.println(t);
        } else {
            trim(t);
            t.printStackTrace(stream);
        }
    }

    /** What e.printStackTrace(writer) becomes; see printStackTraceOf(Throwable, PrintStream). */
    public static void printStackTraceOf(Throwable t, PrintWriter writer) {
        if (thrownByRuntime(t)) {
            writer.println(t);
        } else {
            trim(t);
            t.printStackTrace(writer);
        }
    }

    /** What e.getStackTrace() becomes: empty for an exception the runtime threw. */
    public static StackTraceElement[] stackTraceOf(Throwable t) {
        return thrownByRuntime(t) ? new StackTraceElement[0] : t.getStackTrace();
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
        return runWith(classPath, mainClass, stdin, "");
    }

    /**
     * As {@link #run(String, String, String)}, with run options (a separate
     * name, not an overload: CheerpJ resolves overloads unreliably): see
     * {@link RunOptions}. The result also has "runtimeFault": why the run
     * looks like it failed inside CheerpJ rather than in the student's code,
     * or null.
     */
    public static String runWith(String classPath, String mainClass, String stdin, String options) throws IOException {
        Capture out = new Capture();
        Capture err = new Capture();
        long start = System.nanoTime();
        int exitCode = launchMain(classPath, mainClass,
                new ByteArrayInputStream(stdin.getBytes(StandardCharsets.UTF_8)), out, err, RunOptions.parse(options));
        long ms = (System.nanoTime() - start) / 1_000_000;
        return "{\"exitCode\":" + exitCode
                + ",\"stdout\":" + json(out.text())
                + ",\"stderr\":" + json(err.text())
                + ",\"stdoutTruncated\":" + out.truncated
                + ",\"stderrTruncated\":" + err.truncated
                + ",\"runtimeFault\":" + json(runtimeFault)
                + ",\"ms\":" + ms + "}";
    }

    /**
     * Runs mainClass connected to the page, for the Run button's console:
     * output goes to the page as it is written, and each read of standard
     * input waits for the student to type a line. Browser only: the two
     * native methods below are implemented by the worker.
     *
     * @return JSON {"exitCode", "outputTruncated", "ms"}; the output itself
     *     has already been sent.
     */
    public static String runInteractive(String classPath, String mainClass) throws IOException {
        return runInteractiveWith(classPath, mainClass, "");
    }

    /**
     * As {@link #runInteractive(String, String)}, with run options. With
     * "swingPanel=ClassName" it runs no main: it builds that panel with the
     * Swing fakes and lets the page draw and drive it (see sivaku.swing.SwingHost),
     * sending the panel as JSON on the "ui" stream after every event, until
     * the page ends the input.
     */
    public static String runInteractiveWith(String classPath, String mainClass, String options) throws IOException {
        HostOutput out = new HostOutput("out");
        HostOutput err = new HostOutput("err");
        long start = System.nanoTime();
        int exitCode = launchMain(classPath, mainClass, new HostInput(), out, err, RunOptions.parse(options));
        long ms = (System.nanoTime() - start) / 1_000_000;
        return "{\"exitCode\":" + exitCode
                + ",\"outputTruncated\":" + (out.truncated || err.truncated)
                + ",\"runtimeFault\":" + json(runtimeFault)
                + ",\"ms\":" + ms + "}";
    }

    /** Sends output to the page ("out", "err", or "ui" for a Swing panel). Implemented in the worker. */
    private static native void hostWrite(String stream, String text);

    /** Waits for the student to type a line; null when they end the input. Implemented in the worker. */
    private static native String hostReadLine();

    /** Runs main with these streams and returns the exit code, reporting failures as the java launcher does. */
    private static int launchMain(String classPath, String mainClass, InputStream in, OutputStream out, OutputStream err,
            RunOptions options) throws IOException {
        int exitCode = 0;
        try (RunLoader loader = open(classPath, in, out, err, options)) {
            warmUp(loader, options);
            try {
                if (options.swingPanel() != null) {
                    serveSwingPanel(loader, options.swingPanel());
                } else {
                    launch(loader.loadClass(mainClass));
                }
            } catch (InvocationTargetException e) {
                // While the loader is open: it is what tells the run's own frames apart.
                noteRuntimeFault(e.getCause(), "main");
                throw e;
            }
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
        return exitCode;
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
        return callHarnessWith(classPath, harnessClass, method, "");
    }

    /** As {@link #callHarness(String, String, String)}, with run options; the result also has "runtimeFault". */
    public static String callHarnessWith(String classPath, String harnessClass, String method, String options)
            throws IOException {
        Capture out = new Capture();
        Capture err = new Capture();
        String reason = null;
        String noReply = null;
        long start = System.nanoTime();
        RunOptions parsed = RunOptions.parse(options);
        try (RunLoader loader = open(classPath, InputStream.nullInputStream(), out, err, parsed)) {
            warmUp(loader, parsed);
            Method test = loader.loadClass(harnessClass).getMethod(method);
            if (!Modifier.isStatic(test.getModifiers())) {
                throw new NoSuchMethodException(harnessClass + "." + method + " is not static");
            }
            try {
                test.invoke(null);
            } catch (InvocationTargetException e) {
                // While the loader is open: it is what tells the run's own frames apart.
                noteRuntimeFault(e.getCause(), "the test");
                throw e;
            }
        } catch (InvocationTargetException e) {
            reason = describeFailure(e.getCause());
            if (e.getCause() instanceof sivaku.harness.NoReply silent) {
                noReply = silent.need();
            }
        } catch (ReflectiveOperationException | LinkageError e) {
            // The harness itself is broken, or could not link against the
            // student's classes (a method the student renamed, say).
            reason = describeFailure(e);
        } finally {
            close();
        }
        long ms = (System.nanoTime() - start) / 1_000_000;
        // A thread that died inside CheerpJ fails the case even if the test's own checks passed.
        boolean passed = reason == null && runtimeFault == null;
        if (!passed && reason == null) {
            reason = "A thread stopped unexpectedly: " + runtimeFault;
        }
        return "{\"passed\":" + passed
                + ",\"reason\":" + json(reason)
                + ",\"stdout\":" + json(out.text())
                + ",\"stderr\":" + json(err.text())
                + ",\"runtimeFault\":" + json(runtimeFault)
                + ",\"noReply\":" + json(noReply)
                + ",\"ms\":" + ms + "}";
    }

    /**
     * Runs a student's JUnit 5 test class with the small runner (TestRunner),
     * for the JUnit question: the class path puts one hidden implementation
     * first, so each implementation gets its own class loader and run.
     *
     * @return JSON {"tests": [{"name", "passed", "skipped", "reason"}], "error",
     *     "runtimeFault", "stdout", "stderr", "ms"}; error is set (and tests
     *     null) when the test class could not be loaded or run at all.
     */
    public static String runTests(String classPath, String testClass, String options) throws IOException {
        Capture out = new Capture();
        Capture err = new Capture();
        String tests = null;
        String error = null;
        long start = System.nanoTime();
        RunOptions parsed = RunOptions.parse(options);
        try (RunLoader loader = open(classPath, InputStream.nullInputStream(), out, err, parsed)) {
            warmUp(loader, parsed);
            tests = TestRunner.run(loader.loadClass(testClass), Sandbox::describeFailure);
        } catch (ReflectiveOperationException | LinkageError e) {
            error = describeFailure(e);
        } finally {
            close();
        }
        long ms = (System.nanoTime() - start) / 1_000_000;
        return "{\"tests\":" + (tests == null ? "null" : tests)
                + ",\"error\":" + json(error)
                + ",\"runtimeFault\":" + json(runtimeFault)
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

    /**
     * Why the current run looks like it failed inside CheerpJ rather than in
     * the student's code (see {@link #noteRuntimeFault}), or null.
     */
    private static volatile String runtimeFault;

    /** The current run's class loader, to tell its own stack frames from the runtime's. */
    private static volatile RunLoader current;

    /** Points the shared streams at this run's input and capture, and opens its class loader. */
    private static RunLoader open(String classPath, InputStream in, OutputStream out, OutputStream err,
            RunOptions options) throws IOException {
        STDIN.use(in);
        STDOUT.use(out);
        STDERR.use(err);
        List<URL> urls = new ArrayList<>();
        for (String entry : classPath.split(java.util.regex.Pattern.quote(File.pathSeparator))) {
            if (!entry.isEmpty()) {
                urls.add(Path.of(entry).toUri().toURL());
            }
        }
        // Each run starts on an empty simulated network.
        sivaku.net.FakeNet.reset();
        RunLoader loader = new RunLoader(urls.toArray(URL[]::new), Sandbox.class.getClassLoader(), options.swing());
        Thread.currentThread().setContextClassLoader(loader);
        current = loader;
        runtimeFault = null;
        // Threads the run starts report as the java launcher would, and are
        // checked for failures inside the runtime itself.
        Thread.setDefaultUncaughtExceptionHandler((thread, t) -> {
            noteRuntimeFault(t, "thread \"" + thread.getName() + "\"");
            System.err.print("Exception in thread \"" + thread.getName() + "\" ");
            printTrace(t);
        });
        return loader;
    }

    /**
     * Notes an exception with no stack frame in the run's own classes: it was
     * thrown inside CheerpJ (or the JDK) without the student's code being on
     * the stack at all, as when CheerpJ kills a thread the first time several
     * threads start the same code together (java/proofs/m3/threads). Graders
     * rerun such a test once before failing it.
     */
    static void noteRuntimeFault(Throwable t, String where) {
        RunLoader loader = current;
        if (loader == null || t instanceof ExitSignal) {
            return;
        }
        if (thrownByRuntime(t)) {
            if (runtimeFault == null) {
                runtimeFault = where + ": " + t.getClass().getName() + " inside the Java runtime";
            }
            return;
        }
        for (Throwable x = t; x != null; x = x.getCause()) {
            for (StackTraceElement frame : x.getStackTrace()) {
                if (loader.isOwn(frame.getClassName())) {
                    return;
                }
            }
        }
        if (runtimeFault == null) {
            runtimeFault = where + ": " + t;
        }
    }

    /**
     * Calls the question's warm-up, if any, in the run's own class loader with
     * its output discarded; whatever it throws is ignored. CheerpJ compiles
     * classes per class loader, so the warm-up must share the run's.
     */
    private static void warmUp(RunLoader loader, RunOptions options) {
        if (options.warmUp() == null) {
            return;
        }
        OutputStream out = STDOUT.target;
        OutputStream err = STDERR.target;
        InputStream in = STDIN.target;
        STDOUT.use(OutputStream.nullOutputStream());
        STDERR.use(OutputStream.nullOutputStream());
        STDIN.use(InputStream.nullInputStream());
        try {
            loader.loadClass(options.warmUp()).getMethod("warmUp").invoke(null);
        } catch (Throwable ignored) {
            // A warm-up only exercises code; the run itself reports any problem.
        } finally {
            STDOUT.use(out);
            STDERR.use(err);
            STDIN.use(in);
            runtimeFault = null;
        }
    }

    /** Run for a Swing question: builds the panel and lets the page draw it and send clicks and typing. */
    private static void serveSwingPanel(RunLoader loader, String panelClass) throws ReflectiveOperationException {
        Constructor<?> make = loader.loadClass(panelClass).getDeclaredConstructor();
        make.setAccessible(true);
        Object panel = make.newInstance();
        if (!(panel instanceof sivaku.swing.FakeComponent root)) {
            System.err.println(panelClass + " is not a JPanel");
            return;
        }
        sivaku.swing.SwingHost host = new sivaku.swing.SwingHost(root);
        hostWrite("ui", host.render());
        String event;
        while ((event = hostReadLine()) != null) {
            try {
                host.apply(event);
            } catch (Throwable t) {
                // As Swing does: a listener's exception is reported and the window carries on.
                noteRuntimeFault(t, "a listener");
                trim(t);
                System.err.print("Exception in thread \"AWT-EventQueue-0\" ");
                printTrace(t);
            }
            System.out.flush();
            System.err.flush();
            hostWrite("ui", host.render());
        }
    }

    /** Flushes and disconnects the shared streams after a run. */
    private static void close() {
        System.out.flush();
        System.err.flush();
        Thread.setDefaultUncaughtExceptionHandler(null);
        // Servers and sockets the run left open close, so no thread of it
        // stays blocked in accept() or readLine().
        sivaku.net.FakeNet.reset();
        current = null;
        Thread.currentThread().setContextClassLoader(Sandbox.class.getClassLoader());
        STDIN.use(InputStream.nullInputStream());
        STDOUT.use(OutputStream.nullOutputStream());
        STDERR.use(OutputStream.nullOutputStream());
        drainIoReader();
    }

    /**
     * java.lang.IO keeps one buffered reader on System.in for the life of the
     * JVM, so input a run left unread (it crashed, or simply stopped reading)
     * would be read first by the next run. With System.in now empty, read
     * what is left in that buffer until IO.readln() reports the end.
     */
    private static void drainIoReader() {
        try {
            Method readln = Class.forName("java.lang.IO").getMethod("readln");
            for (int i = 0; i < 1_000_000 && readln.invoke(null) != null; i++) {
                // discard
            }
        } catch (ReflectiveOperationException | RuntimeException | Error e) {
            // No java.lang.IO on this runtime, or nothing to drain.
        }
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
        if (thrownByRuntime(t)) {
            System.err.println("Exception in thread \"main\" " + t);
            return;
        }
        StringWriter text = new StringWriter();
        t.printStackTrace(new PrintWriter(text));
        System.err.print("Exception in thread \"main\" " + text);
    }

    /**
     * Whether t, or a cause, is an exception CheerpJ throws when it fails
     * itself (java/proofs/m3/cheerpj-thread-death): an
     * ArrayIndexOutOfBoundsException or ClassCastException with no message,
     * which the JDK always gives one. Its stack trace must never be read:
     * getStackTrace() or printStackTrace() on it crashes the browser tab on
     * Linux, and throws on Windows. Its class and message are safe.
     */
    static boolean thrownByRuntime(Throwable t) {
        for (Throwable x = t; x != null; x = x.getCause()) {
            if ((x instanceof ArrayIndexOutOfBoundsException || x instanceof ClassCastException) && x.getMessage() == null) {
                return true;
            }
        }
        return false;
    }

    /** printStackTrace to System.err; for an exception the runtime threw, only its first line (type and message). */
    static void printTrace(Throwable t) {
        if (thrownByRuntime(t)) {
            System.err.println(t);
        } else {
            t.printStackTrace(System.err);
        }
    }

    private static void trim(Throwable t) {
        if (thrownByRuntime(t)) {
            return;
        }
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

    /**
     * Sends a run's output to the page on every flush (each println, before
     * each read of input, and at the end), up to MAX_CAPTURE bytes in all.
     */
    private static final class HostOutput extends OutputStream {
        private final String stream;
        private final ByteArrayOutputStream pending = new ByteArrayOutputStream();
        private int sent;
        private boolean truncated;

        HostOutput(String stream) {
            this.stream = stream;
        }

        @Override
        public synchronized void write(int b) {
            write(new byte[] {(byte) b}, 0, 1);
        }

        @Override
        public synchronized void write(byte[] b, int off, int len) {
            int room = MAX_CAPTURE - sent - pending.size();
            if (len > room) {
                len = Math.max(room, 0);
                if (!truncated) {
                    truncated = true;
                    pending.write(b, off, len);
                    flush();
                    hostWrite(stream, "\n[Output cut off at 1 MB]\n");
                    return;
                }
            }
            pending.write(b, off, len);
            if (pending.size() >= 8192) {
                flush();
            }
        }

        @Override
        public synchronized void flush() {
            if (pending.size() > 0) {
                sent += pending.size();
                hostWrite(stream, pending.toString(StandardCharsets.UTF_8));
                pending.reset();
            }
        }
    }

    /** Standard input typed by the student, one line at a time, asked for only when the program reads. */
    private static final class HostInput extends InputStream {
        private byte[] line = new byte[0];
        private int pos;
        private boolean ended;

        private boolean fill() {
            if (pos < line.length) {
                return true;
            }
            if (ended) {
                return false;
            }
            // Show any prompt before waiting for the answer.
            System.out.flush();
            System.err.flush();
            String typed = hostReadLine();
            if (typed == null) {
                ended = true;
                return false;
            }
            line = (typed + "\n").getBytes(StandardCharsets.UTF_8);
            pos = 0;
            return true;
        }

        @Override
        public synchronized int read() {
            return fill() ? line[pos++] & 0xff : -1;
        }

        @Override
        public synchronized int read(byte[] b, int off, int len) {
            if (len == 0) {
                return 0;
            }
            if (!fill()) {
                return -1;
            }
            int n = Math.min(len, line.length - pos);
            System.arraycopy(line, pos, b, off, n);
            pos += n;
            return n;
        }

        @Override
        public synchronized int available() {
            return line.length - pos;
        }
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
