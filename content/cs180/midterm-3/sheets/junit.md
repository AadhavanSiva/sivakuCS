s and t are Strings; x is a number.

## JUnit 5

| Expression | What it does |
|---|---|
| `import org.junit.jupiter.api.Test;` `import static org.junit.jupiter.api.Assertions.*;` | The imports a test class needs |
| `@Test public void name() { ... }` | One test; it fails if an assertion in it fails or it throws |
| `assertEquals(expected, actual)` | Fails unless the two are equal; the expected value comes first |
| `assertEquals(expected, actual, 0.001)` | For doubles: fails unless they are within 0.001 of each other |
| `assertTrue(x)`, `assertFalse(x)` | Fails unless `x` is true, or false |
| `assertNull(x)`, `assertNotNull(x)` | Fails unless `x` is null, or not null |
| `assertThrows(IllegalArgumentException.class, () -> code)` | Fails unless the code throws that exception |
