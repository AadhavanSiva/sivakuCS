package org.junit.jupiter.api.function;

/** As in JUnit 5: code passed to assertThrows, assertAll and friends. */
@FunctionalInterface
public interface Executable {
    void execute() throws Throwable;
}
