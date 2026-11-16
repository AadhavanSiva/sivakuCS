package org.junit.jupiter.api.function;

/** The code passed to assertThrows, as in JUnit 5. */
@FunctionalInterface
public interface Executable {
    void execute() throws Throwable;
}
