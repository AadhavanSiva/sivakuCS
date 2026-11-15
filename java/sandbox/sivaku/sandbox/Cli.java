package sivaku.sandbox;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Drives {@link Sandbox} from Node on a local JDK, so `npm run verify`
 * grades with exactly the code the browser uses.
 *
 * <p>One request per line: a Sandbox method name, then its String
 * arguments, each Base64 (UTF-8), separated by spaces. One reply per line:
 * {@code OK <base64 result>}, {@code NULL} (a void method, or a null
 * result) or {@code ERR <base64 message>}.
 */
public final class Cli {

    private Cli() {
    }

    public static void main(String[] args) throws Exception {
        // Taken before Sandbox loads: its static initialiser replaces
        // System.in and System.out with streams it switches per run.
        BufferedReader requests = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
        PrintStream replies = new PrintStream(System.out, true, StandardCharsets.UTF_8);

        String line;
        while ((line = requests.readLine()) != null) {
            if (line.isBlank()) {
                continue;
            }
            // Limit -1 keeps an empty last argument (empty stdin encodes to "").
            String[] parts = line.split(" ", -1);
            String[] a = new String[parts.length - 1];
            for (int i = 1; i < parts.length; i++) {
                a[i - 1] = new String(Base64.getDecoder().decode(parts[i]), StandardCharsets.UTF_8);
            }
            try {
                String result = call(parts[0], a);
                replies.println(result == null ? "NULL" : "OK " + encode(result));
            } catch (Throwable t) {
                replies.println("ERR " + encode(t.toString()));
            }
        }
    }

    private static String call(String method, String[] a) throws Exception {
        return switch (method + "/" + a.length) {
            case "info/0" -> Sandbox.info();
            case "reset/1" -> {
                Sandbox.reset(a[0]);
                yield null;
            }
            case "clearExcept/2" -> {
                Sandbox.clearExcept(a[0], a[1]);
                yield null;
            }
            case "writeFile/2" -> {
                Sandbox.writeFile(a[0], a[1]);
                yield null;
            }
            case "readFile/1" -> Sandbox.readFile(a[0]);
            case "readTree/2" -> Sandbox.readTree(a[0], a[1]);
            case "compile/2" -> Sandbox.compile(a[0], a[1]);
            case "compileWith/3" -> Sandbox.compileWith(a[0], a[1], a[2]);
            case "run/3" -> Sandbox.run(a[0], a[1], a[2]);
            case "callHarness/3" -> Sandbox.callHarness(a[0], a[1], a[2]);
            default -> throw new IllegalArgumentException("Unknown request: " + method + " with " + a.length + " arguments");
        };
    }

    private static String encode(String s) {
        return Base64.getEncoder().encodeToString(s.getBytes(StandardCharsets.UTF_8));
    }
}
