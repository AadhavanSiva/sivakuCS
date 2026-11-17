import static org.junit.jupiter.api.Assertions.*;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

/**
 * Every family of JUnit 5 assertions, passing (ok...) and failing (bad...),
 * plus the lifecycle annotations. e2e/junit-runner.spec.ts requires the
 * small runner to pass and fail exactly the tests real JUnit does.
 */
public class AssertionsTour {
    private static int beforeAll;
    private int[] list;

    @BeforeAll
    static void once() {
        beforeAll++;
    }

    @BeforeEach
    void setUp() {
        list = new int[] {1, 2, 3};
    }

    @AfterEach
    void tearDown() {
        list = null;
    }

    @Test
    void okLifecycle() {
        assertEquals(1, beforeAll);
        assertArrayEquals(new int[] {1, 2, 3}, list);
        list[0] = 9;
    }

    @Test
    void okFreshInstanceEachTest() {
        assertEquals(1, list[0]);
    }

    @Test
    void okEquals() {
        assertEquals(3, 1 + 2);
        assertEquals(3L, 3L, "longs");
        assertEquals('a', 'a');
        assertEquals((byte) 2, (byte) 2);
        assertEquals((short) 2, (short) 2, () -> "shorts");
        assertEquals(0.1 + 0.2, 0.3, 1e-9);
        assertEquals(1.5f, 1.5f);
        assertEquals(Double.NaN, Double.NaN);
        assertEquals("text", new String("text"));
        assertEquals(7, Integer.valueOf(7));
    }

    @Test
    void badEqualsInts() {
        assertEquals(3, 4);
    }

    @Test
    void badEqualsBoxedTypes() {
        assertEquals(Integer.valueOf(1), Long.valueOf(1));
    }

    @Test
    void badEqualsDelta() {
        assertEquals(1.0, 1.1, 0.05);
    }

    @Test
    void okNotEquals() {
        assertNotEquals(1, 2);
        assertNotEquals("a", "b");
        assertNotEquals(1.0, 1.2, 0.1);
    }

    @Test
    void badNotEquals() {
        assertNotEquals("same", "same");
    }

    @Test
    void okArrays() {
        assertArrayEquals(new double[] {1.0, 2.0}, new double[] {1.0, 2.0000001}, 1e-3);
        assertArrayEquals(new Object[] {"a", new int[] {1, 2}}, new Object[] {"a", new int[] {1, 2}});
        assertArrayEquals(new char[] {'x'}, new char[] {'x'}, "chars");
        assertArrayEquals((long[]) null, null);
    }

    @Test
    void badArraysLength() {
        assertArrayEquals(new int[] {1, 2}, new int[] {1, 2, 3});
    }

    @Test
    void badArraysNested() {
        assertArrayEquals(new Object[] {new int[] {1, 2}}, new Object[] {new int[] {1, 3}});
    }

    @Test
    void okIterables() {
        assertIterableEquals(List.of(1, List.of(2, 3)), Arrays.asList(1, Arrays.asList(2, 3)));
    }

    @Test
    void badIterables() {
        assertIterableEquals(List.of(1, 2), List.of(1, 2, 3));
    }

    @Test
    void okLines() {
        assertLinesMatch(List.of("start", "\\d+ items", ">> skip >>", "end"),
                List.of("start", "12 items", "a", "b", "end"));
        assertLinesMatch(Stream.of("x", ">> 2 >>", "y"), Stream.of("x", "1", "2", "y"));
    }

    @Test
    void badLines() {
        assertLinesMatch(List.of("one", "two"), List.of("one", "three"));
    }

    @Test
    void okTruth() {
        assertTrue(1 < 2);
        assertTrue(() -> true, "supplier");
        assertFalse(2 < 1, () -> "message");
        assertNull(null);
        assertNotNull(list);
    }

    @Test
    void badTrue() {
        assertTrue(list.length == 4, "three elements");
    }

    @Test
    void badNull() {
        assertNull("not null");
    }

    @Test
    void okSame() {
        String s = "x";
        assertSame(s, s);
        assertNotSame(new String("x"), new String("x"));
    }

    @Test
    void badSame() {
        assertSame(new String("x"), new String("x"));
    }

    @Test
    void okThrows() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> {
            throw new IllegalArgumentException("bad");
        });
        assertEquals("bad", e.getMessage());
        assertThrows(RuntimeException.class, () -> Integer.parseInt("x"));
        assertThrowsExactly(NumberFormatException.class, () -> Integer.parseInt("x"));
        assertDoesNotThrow(() -> Integer.parseInt("5"));
        assertEquals(5, assertDoesNotThrow(() -> Integer.parseInt("5")));
    }

    @Test
    void badThrowsNothing() {
        assertThrows(IllegalStateException.class, () -> Integer.parseInt("5"));
    }

    @Test
    void badThrowsWrongType() {
        assertThrows(IllegalStateException.class, () -> Integer.parseInt("x"));
    }

    @Test
    void badThrowsExactlySubclass() {
        assertThrowsExactly(RuntimeException.class, () -> Integer.parseInt("x"));
    }

    @Test
    void badDoesNotThrow() {
        assertDoesNotThrow(() -> Integer.parseInt("x"));
    }

    @Test
    void okAll() {
        assertAll("sums", () -> assertEquals(2, 1 + 1), () -> assertTrue(true));
        assertAll(List.<Executable>of(() -> assertNotNull("x")));
    }

    @Test
    void badAll() {
        assertAll(() -> assertEquals(1, 2), () -> assertEquals(3, 3), () -> fail("second"));
    }

    @Test
    void okTimeouts() {
        assertTimeout(Duration.ofSeconds(5), () -> Thread.sleep(1));
        assertEquals(4, assertTimeoutPreemptively(Duration.ofSeconds(5), () -> 2 + 2));
    }

    @Test
    void badTimeoutPreemptively() {
        assertTimeoutPreemptively(Duration.ofMillis(50), () -> Thread.sleep(2000));
    }

    @Test
    void okInstanceOf() {
        Object o = "text";
        String s = assertInstanceOf(String.class, o);
        assertEquals(4, s.length());
    }

    @Test
    void badInstanceOf() {
        assertInstanceOf(Integer.class, "text");
    }

    @Test
    void badFail() {
        fail("on purpose");
    }

    @Test
    void badUnexpectedException() {
        int[] none = new int[0];
        assertEquals(0, none[1]);
    }

    @Test
    @Disabled("skipped by both runners")
    void skipped() {
        fail("never runs");
    }

    @Test
    @DisplayName("a test with a display name")
    void okNamed() {
        assertTrue(true);
    }
}
