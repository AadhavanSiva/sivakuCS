import java.lang.annotation.Annotation;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Comparator;

/**
 * Midterm 3 proof 3b: the small runner. Runs every method annotated
 * {@code @org.junit.jupiter.api.Test} on a fresh instance, as JUnit 5 does,
 * and counts the ones that throw as failed.
 *
 * <p>args: implementations folder, model tests folder, starter tests folder.
 */
public class MiniRunnerProof {
    static Scoring.Outcome run(Class<?> testClass) throws Exception {
        @SuppressWarnings("unchecked")
        Class<? extends Annotation> test = (Class<? extends Annotation>) Class.forName(
                "org.junit.jupiter.api.Test", false, testClass.getClassLoader());
        Constructor<?> make = testClass.getDeclaredConstructor();
        make.setAccessible(true);
        int passed = 0;
        int failed = 0;
        String first = null;
        Method[] methods = testClass.getDeclaredMethods();
        Arrays.sort(methods, Comparator.comparing(Method::getName));
        for (Method method : methods) {
            if (!method.isAnnotationPresent(test)) {
                continue;
            }
            method.setAccessible(true);
            try {
                method.invoke(make.newInstance());
                passed++;
            } catch (InvocationTargetException e) {
                failed++;
                if (first == null) {
                    first = method.getName() + ": " + e.getCause();
                }
            }
        }
        return new Scoring.Outcome(passed, failed, first);
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            // The sandbox passes no arguments; the browser test sends them as lines of input.
            args = new String(System.in.readAllBytes()).trim().split("\\R");
        }
        long start = System.nanoTime();
        String model = Scoring.score(MiniRunnerProof::run, Path.of(args[0]), Path.of(args[1]));
        long modelMs = (System.nanoTime() - start) / 1_000_000;
        start = System.nanoTime();
        String starter = Scoring.score(MiniRunnerProof::run, Path.of(args[0]), Path.of(args[2]));
        long starterMs = (System.nanoTime() - start) / 1_000_000;
        System.out.println("{\"runner\":\"mini\",\"model\":" + model + ",\"modelMs\":" + modelMs
                + ",\"starter\":" + starter + ",\"starterMs\":" + starterMs + "}");
    }
}
