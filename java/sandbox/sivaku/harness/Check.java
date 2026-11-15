package sivaku.harness;

import java.util.Objects;

/**
 * Assertions for hidden test harnesses (a question's harness/ folder).
 *
 * <p>A failed check throws an AssertionError whose message the student sees
 * on the sample case, in JUnit's style:
 * {@code describe a student ==> expected: <Student of CS> but was: <null>}.
 * Hidden cases show only pass or fail.
 */
public final class Check {

    private Check() {
    }

    public static void equal(String what, Object expected, Object actual) {
        if (!Objects.equals(expected, actual)) {
            throw failure(what, expected, actual);
        }
    }

    public static void equal(String what, long expected, long actual) {
        if (expected != actual) {
            throw failure(what, expected, actual);
        }
    }

    public static void equal(String what, boolean expected, boolean actual) {
        if (expected != actual) {
            throw failure(what, expected, actual);
        }
    }

    /** Equal within {@code tolerance}, for computed doubles. */
    public static void equal(String what, double expected, double actual, double tolerance) {
        if (!(Math.abs(expected - actual) <= tolerance)) {
            throw failure(what, expected, actual);
        }
    }

    public static void isTrue(String what, boolean condition) {
        if (!condition) {
            throw failure(what, true, false);
        }
    }

    public static void fail(String message) {
        throw new AssertionError(message);
    }

    private static AssertionError failure(String what, Object expected, Object actual) {
        return new AssertionError(what + " ==> expected: <" + expected + "> but was: <" + actual + ">");
    }
}
