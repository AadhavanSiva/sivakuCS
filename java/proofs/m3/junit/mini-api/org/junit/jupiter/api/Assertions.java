package org.junit.jupiter.api;

import java.util.Objects;
import org.junit.jupiter.api.function.Executable;

/**
 * The small runner's stand-in for JUnit 5's Assertions: the methods a
 * Midterm 3 reference sheet lists, with JUnit's failure messages.
 */
public final class Assertions {
    private Assertions() {
    }

    private static AssertionError failure(String message, Object expected, Object actual) {
        String prefix = message == null ? "" : message + " ==> ";
        return new AssertionError(prefix + "expected: <" + expected + "> but was: <" + actual + ">");
    }

    public static void assertEquals(long expected, long actual) {
        assertEquals(expected, actual, (String) null);
    }

    public static void assertEquals(long expected, long actual, String message) {
        if (expected != actual) {
            throw failure(message, expected, actual);
        }
    }

    public static void assertEquals(double expected, double actual, double delta) {
        assertEquals(expected, actual, delta, null);
    }

    public static void assertEquals(double expected, double actual, double delta, String message) {
        if (Double.compare(expected, actual) != 0 && !(Math.abs(expected - actual) <= delta)) {
            throw failure(message, expected, actual);
        }
    }

    public static void assertEquals(Object expected, Object actual) {
        assertEquals(expected, actual, (String) null);
    }

    public static void assertEquals(Object expected, Object actual, String message) {
        if (!Objects.equals(expected, actual)) {
            throw failure(message, expected, actual);
        }
    }

    public static void assertTrue(boolean condition) {
        assertTrue(condition, null);
    }

    public static void assertTrue(boolean condition, String message) {
        if (!condition) {
            throw failure(message, true, false);
        }
    }

    public static void assertFalse(boolean condition) {
        assertFalse(condition, null);
    }

    public static void assertFalse(boolean condition, String message) {
        if (condition) {
            throw failure(message, false, true);
        }
    }

    public static void assertNull(Object actual) {
        if (actual != null) {
            throw failure(null, null, actual);
        }
    }

    public static void assertNotNull(Object actual) {
        if (actual == null) {
            throw new AssertionError("expected: not <null>");
        }
    }

    public static <T extends Throwable> T assertThrows(Class<T> expectedType, Executable executable) {
        try {
            executable.execute();
        } catch (Throwable actual) {
            if (expectedType.isInstance(actual)) {
                return expectedType.cast(actual);
            }
            throw new AssertionError("Unexpected exception type thrown, expected: <" + expectedType.getName()
                    + "> but was: <" + actual.getClass().getName() + ">", actual);
        }
        throw new AssertionError("Expected " + expectedType.getName() + " to be thrown, but nothing was thrown.");
    }

    public static void fail(String message) {
        throw new AssertionError(message);
    }
}
