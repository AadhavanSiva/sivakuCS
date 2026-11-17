package sivaku.sandbox;

import java.lang.annotation.Annotation;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.function.Function;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * The small JUnit 5 runner for the JUnit question: runs a student's test
 * class as JUnit Jupiter does for the annotations a course test class uses.
 * {@code @BeforeAll} once; then for each {@code @Test} method (in name order,
 * skipping {@code @Disabled}) a new instance, its {@code @BeforeEach}
 * methods, the test, and its {@code @AfterEach} methods; then
 * {@code @AfterAll}. The student's tests are compiled against this jar's
 * org.junit.jupiter.api, which keeps JUnit's names and signatures (CI checks
 * the Assertions class against real JUnit's).
 */
final class TestRunner {
    private TestRunner() {
    }

    /** @return a JSON array of {"name", "method", "passed", "skipped", "reason"}, one per test method */
    static String run(Class<?> testClass, Function<Throwable, String> describe) throws ReflectiveOperationException {
        List<Method> all = new ArrayList<>();
        // Superclass methods first, as JUnit runs inherited lifecycle methods first.
        List<Class<?>> chain = new ArrayList<>();
        for (Class<?> c = testClass; c != null && c != Object.class; c = c.getSuperclass()) {
            chain.add(0, c);
        }
        for (Class<?> c : chain) {
            Method[] declared = c.getDeclaredMethods();
            Arrays.sort(declared, Comparator.comparing(Method::getName));
            all.addAll(Arrays.asList(declared));
        }
        List<Method> beforeAll = annotated(all, BeforeAll.class);
        List<Method> afterAll = annotated(all, AfterAll.class);
        List<Method> beforeEach = annotated(all, BeforeEach.class);
        List<Method> afterEach = annotated(all, AfterEach.class);
        List<Method> tests = annotated(all, Test.class);

        Constructor<?> make = testClass.getDeclaredConstructor();
        make.setAccessible(true);
        StringBuilder out = new StringBuilder("[");
        Throwable setUp = invokeAll(beforeAll, null);
        for (Method test : tests) {
            String name = test.isAnnotationPresent(DisplayName.class)
                    ? test.getAnnotation(DisplayName.class).value() : test.getName() + "()";
            boolean skipped = test.isAnnotationPresent(Disabled.class) || testClass.isAnnotationPresent(Disabled.class);
            Throwable failure = null;
            if (!skipped) {
                failure = setUp;
                if (failure == null) {
                    try {
                        Object instance = make.newInstance();
                        failure = invokeAll(beforeEach, instance);
                        if (failure == null) {
                            failure = invoke(test, instance);
                        }
                        Throwable after = invokeAll(afterEach, instance);
                        if (failure == null) {
                            failure = after;
                        }
                    } catch (InvocationTargetException e) {
                        failure = e.getCause();
                    }
                }
            }
            if (failure != null) {
                Sandbox.noteRuntimeFault(failure, "test " + name);
            }
            out.append(out.length() == 1 ? "" : ",")
                    .append("{\"name\":").append(Sandbox.json(name))
                    .append(",\"method\":").append(Sandbox.json(test.getName() + "()"))
                    .append(",\"passed\":").append(!skipped && failure == null)
                    .append(",\"skipped\":").append(skipped)
                    .append(",\"reason\":").append(Sandbox.json(failure == null ? null : describe.apply(failure)))
                    .append("}");
        }
        invokeAll(afterAll, null);
        return out.append("]").toString();
    }

    private static List<Method> annotated(List<Method> methods, Class<? extends Annotation> annotation) {
        List<Method> found = new ArrayList<>();
        for (Method m : methods) {
            if (m.isAnnotationPresent(annotation)) {
                m.setAccessible(true);
                found.add(m);
            }
        }
        return found;
    }

    /** Runs each method in turn; the first failure, or null. */
    private static Throwable invokeAll(List<Method> methods, Object instance) {
        Throwable first = null;
        for (Method m : methods) {
            Throwable t = invoke(m, Modifier.isStatic(m.getModifiers()) ? null : instance);
            if (first == null) {
                first = t;
            }
        }
        return first;
    }

    private static Throwable invoke(Method m, Object instance) {
        try {
            m.invoke(instance);
            return null;
        } catch (InvocationTargetException e) {
            return e.getCause();
        } catch (ReflectiveOperationException e) {
            return e;
        }
    }
}
