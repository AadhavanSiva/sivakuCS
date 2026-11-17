package sivaku.harness;

/**
 * Thrown by a hidden test when the student's code did not reply in time.
 * {@code need} names what got no reply (a command, or "concurrent" for a
 * second client while the first is connected). The grader then fails, without
 * running them, the question's later cases whose tests.json "needs" include
 * it, so an unfinished server costs one wait, not one per case.
 */
public class NoReply extends AssertionError {
    private final String need;

    public NoReply(String need, String message) {
        super(message);
        this.need = need;
    }

    public String need() {
        return need;
    }
}
