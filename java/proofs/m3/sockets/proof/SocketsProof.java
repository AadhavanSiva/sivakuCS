import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.lang.classfile.ClassFile;
import java.lang.classfile.ClassHierarchyResolver;
import java.lang.classfile.ClassTransform;
import java.lang.classfile.CodeTransform;
import java.lang.classfile.Opcode;
import java.lang.classfile.instruction.InvokeInstruction;
import java.lang.classfile.instruction.NewObjectInstruction;
import java.lang.constant.ClassDesc;
import java.lang.reflect.Method;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Midterm 3 proof 2 (cs180-exam-specs section 8): can socket questions be
 * graded? Prints one JSON object on standard output.
 *
 * <p>Part 1 tries real ServerSocket and Socket on localhost, with timeouts
 * so a runtime that hangs cannot stall the JVM. Part 2 proves the fallback:
 * student classes (args[0]) are loaded through a class loader that rewrites
 * {@code new Socket(...)} and {@code new ServerSocket(...)} into in-memory
 * fakes, the technique the sandbox already uses for System.exit; and a
 * handler is driven directly with a fake socket.
 */
public class SocketsProof {
    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            // The sandbox passes no arguments; the browser test sends them as lines of input.
            args = new String(System.in.readAllBytes()).trim().split("\\R");
        }
        StringBuilder out = new StringBuilder("{");
        out.append("\"real\":").append(realSockets());
        Path studentDir = Path.of(args[0]);
        RewritingLoader loader = new RewritingLoader(studentDir, SocketsProof.class.getClassLoader());
        out.append(",\"client\":").append(clientThroughRewrite(loader));
        out.append(",\"server\":").append(serverThroughRewrite(loader));
        out.append(",\"handler\":").append(handlerWithFakeSocket(loader));
        out.append(",\"rewritten\":").append(loader.rewritten).append("}");
        System.out.println(out);
    }

    // ---- part 1: real sockets ----------------------------------------------

    static String realSockets() throws InterruptedException {
        AtomicReference<String> result = new AtomicReference<>();
        long start = System.nanoTime();
        Thread attempt = new Thread(() -> {
            try (ServerSocket server = new ServerSocket(0, 50, InetAddress.getLoopbackAddress())) {
                server.setSoTimeout(3000);
                int port = server.getLocalPort();
                AtomicReference<String> heard = new AtomicReference<>();
                Thread serverThread = new Thread(() -> {
                    try (Socket c = server.accept()) {
                        BufferedReader in = new BufferedReader(new InputStreamReader(c.getInputStream()));
                        heard.set(in.readLine());
                        new PrintWriter(c.getOutputStream(), true).println("echo " + heard.get());
                    } catch (Throwable t) {
                        heard.set("server failed: " + t);
                    }
                });
                serverThread.start();
                try (Socket client = new Socket()) {
                    client.connect(new InetSocketAddress(InetAddress.getLoopbackAddress(), port), 3000);
                    client.setSoTimeout(3000);
                    new PrintWriter(client.getOutputStream(), true).println("hello");
                    String reply = new BufferedReader(new InputStreamReader(client.getInputStream())).readLine();
                    serverThread.join(3000);
                    result.set("{\"works\":" + "echo hello".equals(reply) + ",\"reply\":" + json(reply)
                            + ",\"serverHeard\":" + json(heard.get()) + ",\"port\":" + port);
                }
            } catch (Throwable t) {
                result.set("{\"works\":false,\"error\":" + json(t.toString()));
            }
        });
        attempt.setDaemon(true);
        attempt.start();
        attempt.join(10_000);
        long ms = (System.nanoTime() - start) / 1_000_000;
        String r = result.get();
        if (r == null) {
            r = "{\"works\":false,\"error\":\"no answer within 10 seconds\"";
        }
        return r + ",\"ms\":" + ms + "}";
    }

    // ---- part 2: rewriting student code -------------------------------------

    /** Loads the student's classes itself (not its parent's), rewriting Socket and ServerSocket. */
    static final class RewritingLoader extends ClassLoader {
        private final Path dir;
        int rewritten;
        private final ClassFile classFile;

        RewritingLoader(Path dir, ClassLoader parent) {
            super(parent);
            this.dir = dir;
            // The stack maps are regenerated, so the class file API must be able to see the fakes.
            this.classFile = ClassFile.of(ClassFile.ClassHierarchyResolverOption.of(
                    ClassHierarchyResolver.defaultResolver().orElse(ClassHierarchyResolver.ofResourceParsing(parent))));
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
                    byte[] bytes = rewrite(Files.readAllBytes(file));
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

        private static final ClassDesc SOCKET = ClassDesc.of("java.net.Socket");
        private static final ClassDesc SERVER_SOCKET = ClassDesc.of("java.net.ServerSocket");
        private static final ClassDesc FAKE_SOCKET = ClassDesc.of("FakeSocket");
        private static final ClassDesc FAKE_SERVER_SOCKET = ClassDesc.of("FakeServerSocket");

        private static ClassDesc swap(ClassDesc type) {
            if (type.equals(SOCKET)) {
                return FAKE_SOCKET;
            }
            if (type.equals(SERVER_SOCKET)) {
                return FAKE_SERVER_SOCKET;
            }
            return null;
        }

        byte[] rewrite(byte[] bytes) {
            CodeTransform fakes = (code, element) -> {
                if (element instanceof NewObjectInstruction created) {
                    ClassDesc to = swap(created.className().asSymbol());
                    if (to != null) {
                        code.new_(to);
                        rewritten++;
                        return;
                    }
                }
                if (element instanceof InvokeInstruction call && call.opcode() == Opcode.INVOKESPECIAL
                        && call.name().equalsString("<init>")) {
                    ClassDesc to = swap(call.owner().asSymbol());
                    if (to != null) {
                        code.invokespecial(to, "<init>", call.typeSymbol());
                        return;
                    }
                }
                code.with(element);
            };
            return classFile.transformClass(classFile.parse(bytes), ClassTransform.transformingMethodBodies(fakes));
        }
    }

    /** Topic E: the grader is the server; the student's client connects with new Socket(host, port). */
    static String clientThroughRewrite(ClassLoader loader) throws Exception {
        long start = System.nanoTime();
        List<String> heard = Collections.synchronizedList(new ArrayList<>());
        AtomicReference<String> closedByClient = new AtomicReference<>("unknown");
        FakeServerSocket server = new FakeServerSocket(5100);
        Thread serverThread = new Thread(() -> {
            try (Socket c = server.accept()) {
                BufferedReader in = new BufferedReader(new InputStreamReader(c.getInputStream()));
                PrintWriter out = new PrintWriter(c.getOutputStream(), true);
                String line;
                while ((line = in.readLine()) != null) {
                    heard.add(line);
                    out.println(heard.size() < 3 ? "TAKEN" : "OK");
                }
                closedByClient.set("yes");
            } catch (IOException e) {
                closedByClient.set("error: " + e);
            }
        });
        serverThread.start();
        Method claim = loader.loadClass("StudentClient").getMethod("claim", String.class, int.class, String[].class);
        Object got = claim.invoke(null, "localhost", 5100, new String[] {"ana", "bo", "cy", "di"});
        serverThread.join(5000);
        server.close();
        long ms = (System.nanoTime() - start) / 1_000_000;
        return "{\"returned\":" + json((String) got) + ",\"serverHeard\":" + jsonList(heard)
                + ",\"connectionClosed\":" + json(closedByClient.get()) + ",\"ms\":" + ms + "}";
    }

    /** Topic G: the student's server does new ServerSocket(port); three grader clients connect at once. */
    static String serverThroughRewrite(ClassLoader loader) throws Exception {
        long start = System.nanoTime();
        Method serve = loader.loadClass("StudentServer").getMethod("serve", int.class, int.class);
        AtomicReference<String> failure = new AtomicReference<>();
        Thread serverThread = new Thread(() -> {
            try {
                serve.invoke(null, 6100, 3);
            } catch (Throwable t) {
                failure.set(t.toString());
            }
        });
        serverThread.start();
        List<String> replies = Collections.synchronizedList(new ArrayList<>());
        List<Thread> clients = new ArrayList<>();
        for (String name : new String[] {"ivy", "jo", "kai"}) {
            Thread c = new Thread(() -> {
                try (Socket s = connectWhenListening(6100)) {
                    new PrintWriter(s.getOutputStream(), true).println(name);
                    replies.add(new BufferedReader(new InputStreamReader(s.getInputStream())).readLine());
                } catch (Exception e) {
                    replies.add("client failed: " + e);
                }
            });
            c.start();
            clients.add(c);
        }
        for (Thread c : clients) {
            c.join(5000);
        }
        serverThread.join(5000);
        Collections.sort(replies);
        long ms = (System.nanoTime() - start) / 1_000_000;
        return "{\"replies\":" + jsonList(replies) + ",\"serverFailed\":" + json(failure.get())
                + ",\"serverFinished\":" + !serverThread.isAlive() + ",\"ms\":" + ms + "}";
    }

    static Socket connectWhenListening(int port) throws Exception {
        for (int i = 0; ; i++) {
            try {
                return new FakeSocket("localhost", port);
            } catch (java.net.ConnectException e) {
                if (i == 200) {
                    throw e;
                }
                Thread.sleep(10);
            }
        }
    }

    /** Topic F: the grader holds one end of a fake socket and hands the other to Handler.handle. */
    static String handlerWithFakeSocket(ClassLoader loader) throws Exception {
        long start = System.nanoTime();
        FakeSocket[] ends = FakeSocket.pair();
        Method handle = loader.loadClass("Handler").getMethod("handle", Socket.class);
        AtomicReference<String> failure = new AtomicReference<>();
        Thread handler = new Thread(() -> {
            try {
                handle.invoke(null, ends[1]);
            } catch (Throwable t) {
                failure.set(t.toString());
            }
        });
        handler.start();
        PrintWriter toHandler = new PrintWriter(ends[0].getOutputStream(), true);
        BufferedReader fromHandler = new BufferedReader(new InputStreamReader(ends[0].getInputStream()));
        List<String> replies = new ArrayList<>();
        for (String command : new String[] {"ADD 2", "ADD 5", "SHOUT", "BYE"}) {
            toHandler.println(command);
            replies.add(fromHandler.readLine());
        }
        String afterBye = fromHandler.readLine();
        handler.join(5000);
        long ms = (System.nanoTime() - start) / 1_000_000;
        return "{\"replies\":" + jsonList(replies) + ",\"afterBye\":" + json(afterBye)
                + ",\"handlerReturned\":" + !handler.isAlive() + ",\"handlerClosed\":" + ends[1].isClosed()
                + ",\"failure\":" + json(failure.get()) + ",\"ms\":" + ms + "}";
    }

    // ---- JSON ---------------------------------------------------------------

    static String json(String s) {
        return s == null ? "null" : "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    static String jsonList(List<String> list) {
        List<String> quoted = new ArrayList<>();
        synchronized (list) {
            for (String s : list) {
                quoted.add(json(s));
            }
        }
        return "[" + String.join(",", quoted) + "]";
    }
}
