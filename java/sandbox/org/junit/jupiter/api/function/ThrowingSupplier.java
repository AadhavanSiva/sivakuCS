package org.junit.jupiter.api.function;

/** As in JUnit 5: a supplier that may throw, for assertDoesNotThrow and assertTimeout. */
@FunctionalInterface
public interface ThrowingSupplier<T> {
    T get() throws Throwable;
}
