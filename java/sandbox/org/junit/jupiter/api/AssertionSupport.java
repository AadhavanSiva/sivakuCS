package org.junit.jupiter.api;

import java.lang.reflect.Array;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.BooleanSupplier;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.api.function.ThrowingSupplier;
import org.opentest4j.AssertionFailedError;
import org.opentest4j.MultipleFailuresError;

/**
 * What the generated Assertions methods call (see scripts/gen-junit-assertions.mjs):
 * one implementation per kind of assertion, with JUnit 5's semantics and
 * failure messages. A message argument is a String, a Supplier of one, or null.
 */
final class AssertionSupport {
    private AssertionSupport() {
    }

    // ---- messages ------------------------------------------------------------------

    static String text(Object message) {
        if (message instanceof Supplier<?> supplier) {
            Object value = supplier.get();
            return value == null ? null : value.toString();
        }
        return (String) message;
    }

    private static String prefix(Object message) {
        String text = text(message);
        return text == null || text.isBlank() ? "" : text + " ==> ";
    }

    private static String show(Object value) {
        if (value == null) {
            return "null";
        }
        if (value.getClass().isArray()) {
            return Arrays.deepToString(new Object[] {value}).replaceAll("^\\[|\\]$", "");
        }
        return String.valueOf(value);
    }

    /** "expected: <1> but was: <2>", with types added when both look the same, as JUnit does. */
    private static String expectedButWas(Object expected, Object actual) {
        String e = show(expected);
        String a = show(actual);
        if (e.equals(a) && expected != null && actual != null) {
            return "expected: " + typed(expected) + "<" + e + "> but was: " + typed(actual) + "<" + a + ">";
        }
        return "expected: <" + e + "> but was: <" + a + ">";
    }

    private static String typed(Object value) {
        return value.getClass().getName() + "@" + Integer.toHexString(System.identityHashCode(value));
    }

    static AssertionFailedError fail(Object message, Throwable cause) {
        return new AssertionFailedError(text(message), cause);
    }

    // ---- equality --------------------------------------------------------------------

    /** Equal as JUnit compares: floats and doubles by their bits (so NaN equals NaN), everything else with equals. */
    private static boolean equalValues(Object expected, Object actual) {
        if (expected instanceof Double e && actual instanceof Double a) {
            return Double.doubleToLongBits(e) == Double.doubleToLongBits(a);
        }
        if (expected instanceof Float e && actual instanceof Float a) {
            return Float.floatToIntBits(e) == Float.floatToIntBits(a);
        }
        return Objects.equals(expected, actual);
    }

    private static void checkDelta(double delta) {
        if (Double.isNaN(delta) || delta < 0.0) {
            throw new AssertionFailedError("positive delta expected but was: <" + delta + ">");
        }
    }

    private static boolean withinDelta(Object expected, Object actual, double delta) {
        if (equalValues(expected, actual)) {
            return true;
        }
        if (expected instanceof Number e && actual instanceof Number a) {
            return Math.abs(e.doubleValue() - a.doubleValue()) <= delta;
        }
        return false;
    }

    static void assertEquals(Object expected, Object actual, Double delta, Object message) {
        if (delta != null) {
            checkDelta(delta);
            if (withinDelta(expected, actual, delta)) {
                return;
            }
        } else if (equalValues(expected, actual)) {
            return;
        }
        throw new AssertionFailedError(prefix(message) + expectedButWas(expected, actual), expected, actual);
    }

    static void assertNotEquals(Object unexpected, Object actual, Double delta, Object message) {
        boolean equal;
        if (delta != null) {
            checkDelta(delta);
            equal = withinDelta(unexpected, actual, delta);
        } else {
            equal = equalValues(unexpected, actual);
        }
        if (equal) {
            throw new AssertionFailedError(prefix(message) + "expected: not equal but was: <" + show(actual) + ">");
        }
    }

    // ---- arrays and iterables ------------------------------------------------------------

    static void assertArrayEquals(Object expected, Object actual, Double delta, Object message) {
        if (delta != null) {
            checkDelta(delta);
        }
        compareArrays(expected, actual, delta, message, new ArrayList<>());
    }

    private static String at(List<Integer> path) {
        StringBuilder b = new StringBuilder();
        for (int i : path) {
            b.append('[').append(i).append(']');
        }
        return b.toString();
    }

    private static void compareArrays(Object expected, Object actual, Double delta, Object message, List<Integer> path) {
        if (expected == actual) {
            return;
        }
        String where = path.isEmpty() ? "" : " at index " + at(path);
        if (expected == null) {
            throw new AssertionFailedError(prefix(message) + "expected array was <null>" + where, null, actual);
        }
        if (actual == null) {
            throw new AssertionFailedError(prefix(message) + "actual array was <null>" + where, expected, null);
        }
        int expectedLength = Array.getLength(expected);
        int actualLength = Array.getLength(actual);
        if (expectedLength != actualLength) {
            throw new AssertionFailedError(prefix(message) + "array lengths differ" + where + ", expected: <"
                    + expectedLength + "> but was: <" + actualLength + ">", expectedLength, actualLength);
        }
        for (int i = 0; i < expectedLength; i++) {
            Object e = Array.get(expected, i);
            Object a = Array.get(actual, i);
            path.add(i);
            if (e != null && a != null && e.getClass().isArray() && a.getClass().isArray()) {
                compareArrays(e, a, delta, message, path);
            } else {
                boolean same = delta != null ? withinDelta(e, a, delta) : equalValues(e, a);
                if (!same) {
                    throw new AssertionFailedError(prefix(message) + "array contents differ at index " + at(path)
                            + ", " + expectedButWas(e, a), e, a);
                }
            }
            path.remove(path.size() - 1);
        }
    }

    static void assertIterableEquals(Iterable<?> expected, Iterable<?> actual, Object message) {
        compareIterables(expected, actual, message, new ArrayList<>());
    }

    private static void compareIterables(Iterable<?> expected, Iterable<?> actual, Object message, List<Integer> path) {
        if (expected == actual) {
            return;
        }
        String where = path.isEmpty() ? "" : " at index " + at(path);
        if (expected == null) {
            throw new AssertionFailedError(prefix(message) + "expected iterable was <null>" + where);
        }
        if (actual == null) {
            throw new AssertionFailedError(prefix(message) + "actual iterable was <null>" + where);
        }
        Iterator<?> e = expected.iterator();
        Iterator<?> a = actual.iterator();
        int i = 0;
        while (e.hasNext() && a.hasNext()) {
            Object x = e.next();
            Object y = a.next();
            path.add(i);
            if (x instanceof Iterable<?> xi && y instanceof Iterable<?> yi) {
                compareIterables(xi, yi, message, path);
            } else if (x != null && y != null && x.getClass().isArray() && y.getClass().isArray()) {
                compareArrays(x, y, null, message, path);
            } else if (!equalValues(x, y)) {
                throw new AssertionFailedError(prefix(message) + "iterable contents differ at index " + at(path)
                        + ", " + expectedButWas(x, y), x, y);
            }
            path.remove(path.size() - 1);
            i++;
        }
        if (e.hasNext() || a.hasNext()) {
            int expectedSize = i;
            int actualSize = i;
            while (e.hasNext()) {
                e.next();
                expectedSize++;
            }
            while (a.hasNext()) {
                a.next();
                actualSize++;
            }
            throw new AssertionFailedError(prefix(message) + "iterable lengths differ" + where + ", expected: <"
                    + expectedSize + "> but was: <" + actualSize + ">");
        }
    }

    /**
     * As JUnit: each expected line matches the actual line equal to it or
     * matching it as a regular expression; an expected line ">> ... >>"
     * skips actual lines up to the next match (or exactly n lines, as in ">> 3 >>").
     */
    static void assertLinesMatch(List<String> expected, List<String> actual, Object message) {
        if (!linesMatch(expected, 0, actual, 0)) {
            throw new AssertionFailedError(prefix(message) + "lines don't match, "
                    + expectedButWas(String.join("\n", expected), String.join("\n", actual)),
                    String.join("\n", expected), String.join("\n", actual));
        }
    }

    static void assertLinesMatch(Stream<String> expected, Stream<String> actual, Object message) {
        assertLinesMatch(expected.collect(Collectors.toList()), actual.collect(Collectors.toList()), message);
    }

    private static boolean isFastForward(String line) {
        String t = line.trim();
        return t.length() >= 4 && t.startsWith(">>") && t.endsWith(">>");
    }

    private static boolean linesMatch(List<String> expected, int ei, List<String> actual, int ai) {
        if (ei == expected.size()) {
            return ai == actual.size();
        }
        String line = expected.get(ei);
        if (isFastForward(line)) {
            String inner = line.trim();
            inner = inner.substring(2, inner.length() - 2).trim();
            if (inner.matches("\\d+")) {
                int skip = Integer.parseInt(inner);
                return ai + skip <= actual.size() && linesMatch(expected, ei + 1, actual, ai + skip);
            }
            for (int k = ai; k <= actual.size(); k++) {
                if (linesMatch(expected, ei + 1, actual, k)) {
                    return true;
                }
            }
            return false;
        }
        if (ai == actual.size()) {
            return false;
        }
        String got = actual.get(ai);
        boolean match = line.equals(got);
        if (!match) {
            try {
                match = got.matches(line);
            } catch (RuntimeException notARegex) {
                match = false;
            }
        }
        return match && linesMatch(expected, ei + 1, actual, ai + 1);
    }

    // ---- truth, null, sameness -----------------------------------------------------------

    static void assertTrue(boolean condition, Object message) {
        if (!condition) {
            throw new AssertionFailedError(prefix(message) + "expected: <true> but was: <false>", true, false);
        }
    }

    static void assertTrue(BooleanSupplier condition, Object message) {
        assertTrue(condition.getAsBoolean(), message);
    }

    static void assertFalse(boolean condition, Object message) {
        if (condition) {
            throw new AssertionFailedError(prefix(message) + "expected: <false> but was: <true>", false, true);
        }
    }

    static void assertFalse(BooleanSupplier condition, Object message) {
        assertFalse(condition.getAsBoolean(), message);
    }

    static void assertNull(Object actual, Object message) {
        if (actual != null) {
            throw new AssertionFailedError(prefix(message) + "expected: <null> but was: <" + show(actual) + ">", null, actual);
        }
    }

    static void assertNotNull(Object actual, Object message) {
        if (actual == null) {
            throw new AssertionFailedError(prefix(message) + "expected: not <null>");
        }
    }

    static void assertSame(Object expected, Object actual, Object message) {
        if (expected != actual) {
            throw new AssertionFailedError(prefix(message) + expectedButWas(expected, actual), expected, actual);
        }
    }

    static void assertNotSame(Object unexpected, Object actual, Object message) {
        if (unexpected == actual) {
            throw new AssertionFailedError(prefix(message) + "expected: not same but was: <" + show(actual) + ">");
        }
    }

    // ---- several at once ------------------------------------------------------------------

    static void assertAll(String heading, Executable... executables) {
        assertAll(heading, Arrays.stream(executables));
    }

    static void assertAll(String heading, Collection<Executable> executables) {
        assertAll(heading, executables.stream());
    }

    static void assertAll(String heading, Stream<Executable> executables) {
        List<Throwable> failures = new ArrayList<>();
        executables.forEach(executable -> {
            try {
                Objects.requireNonNull(executable, "individual executables must not be null").execute();
            } catch (Throwable t) {
                if (t instanceof VirtualMachineError) {
                    throw sneaky(t);
                }
                failures.add(t);
            }
        });
        if (!failures.isEmpty()) {
            throw new MultipleFailuresError(heading, failures);
        }
    }

    // ---- exceptions ----------------------------------------------------------------------

    static <T extends Throwable> T assertThrows(Class<T> expectedType, Executable executable, Object message) {
        try {
            executable.execute();
        } catch (Throwable actual) {
            if (expectedType.isInstance(actual)) {
                return expectedType.cast(actual);
            }
            throw new AssertionFailedError(prefix(message) + "Unexpected exception type thrown, "
                    + expectedButWas(expectedType.getName(), actual.getClass().getName()), actual);
        }
        throw new AssertionFailedError(prefix(message) + "Expected " + expectedType.getName()
                + " to be thrown, but nothing was thrown.");
    }

    static <T extends Throwable> T assertThrowsExactly(Class<T> expectedType, Executable executable, Object message) {
        try {
            executable.execute();
        } catch (Throwable actual) {
            if (actual.getClass().equals(expectedType)) {
                return expectedType.cast(actual);
            }
            throw new AssertionFailedError(prefix(message) + "Unexpected exception type thrown, "
                    + expectedButWas(expectedType.getName(), actual.getClass().getName()), actual);
        }
        throw new AssertionFailedError(prefix(message) + "Expected " + expectedType.getName()
                + " to be thrown, but nothing was thrown.");
    }

    private static AssertionFailedError unexpected(Throwable t, Object message) {
        String detail = t.getMessage();
        return new AssertionFailedError(prefix(message) + "Unexpected exception thrown: " + t.getClass().getName()
                + (detail == null || detail.isBlank() ? "" : ": " + detail), t);
    }

    static void assertDoesNotThrow(Executable executable, Object message) {
        try {
            executable.execute();
        } catch (Throwable t) {
            throw unexpected(t, message);
        }
    }

    static <T> T assertDoesNotThrow(ThrowingSupplier<T> supplier, Object message) {
        try {
            return supplier.get();
        } catch (Throwable t) {
            throw unexpected(t, message);
        }
    }

    static <T> T assertInstanceOf(Class<T> expectedType, Object actual, Object message) {
        if (expectedType.isInstance(actual)) {
            return expectedType.cast(actual);
        }
        String what = actual == null ? "Unexpected null value" : "Unexpected type";
        throw new AssertionFailedError(prefix(message) + what + ", " + expectedButWas(expectedType.getName(),
                actual == null ? null : actual.getClass().getName()));
    }

    // ---- timeouts ------------------------------------------------------------------------

    static void assertTimeout(Duration timeout, Executable executable, Object message) {
        assertTimeout(timeout, () -> {
            executable.execute();
            return null;
        }, message);
    }

    static <T> T assertTimeout(Duration timeout, ThrowingSupplier<T> supplier, Object message) {
        long start = System.nanoTime();
        T result;
        try {
            result = supplier.get();
        } catch (Throwable t) {
            throw sneaky(t);
        }
        long ms = (System.nanoTime() - start) / 1_000_000;
        long limit = timeout.toMillis();
        if (ms > limit) {
            throw new AssertionFailedError(prefix(message) + "execution exceeded timeout of " + limit + " ms by "
                    + (ms - limit) + " ms");
        }
        return result;
    }

    static void assertTimeoutPreemptively(Duration timeout, Executable executable, Object message) {
        assertTimeoutPreemptively(timeout, () -> {
            executable.execute();
            return null;
        }, message);
    }

    static <T> T assertTimeoutPreemptively(Duration timeout, ThrowingSupplier<T> supplier, Object message) {
        return assertTimeoutPreemptively(timeout, supplier, () -> text(message),
                (Assertions.TimeoutFailureFactory<AssertionFailedError>) (d, m, cause, thread) -> {
                    String text = m == null ? null : m.get();
                    String p = text == null || text.isBlank() ? "" : text + " ==> ";
                    return new AssertionFailedError(p + "execution timed out after " + d.toMillis() + " ms", cause);
                });
    }

    static <T, E extends Throwable> T assertTimeoutPreemptively(Duration timeout, ThrowingSupplier<T> supplier,
            Supplier<String> messageSupplier, Assertions.TimeoutFailureFactory<E> failureFactory) throws E {
        AtomicReference<T> result = new AtomicReference<>();
        AtomicReference<Throwable> thrown = new AtomicReference<>();
        Thread worker = new Thread(() -> {
            try {
                result.set(supplier.get());
            } catch (Throwable t) {
                thrown.set(t);
            }
        }, "junit-timeout-worker");
        worker.setDaemon(true);
        worker.start();
        try {
            worker.join(Math.max(1, timeout.toMillis()));
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        if (worker.isAlive()) {
            worker.interrupt();
            throw failureFactory.createTimeoutFailure(timeout, messageSupplier, null, worker);
        }
        if (thrown.get() != null) {
            throw sneaky(thrown.get());
        }
        return result.get();
    }

    @SuppressWarnings("unchecked")
    private static <X extends Throwable> RuntimeException sneaky(Throwable t) throws X {
        throw (X) t;
    }
}
