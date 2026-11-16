import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Runs one student test class against each hidden implementation, each in
 * its own class loader, and scores it as the JUnit question does: 2 if
 * every test passes on the correct one, 3 for each buggy one where some test
 * fails, and 0 for everything if any test fails on the correct one.
 */
final class Scoring {
    static final String[] IMPLEMENTATIONS = {"correct", "empty", "boundary", "invalid", "average"};

    /** One run of a test class: how many tests passed and failed, and the first failure. */
    record Outcome(int passed, int failed, String firstFailure) {
    }

    interface Runner {
        Outcome run(Class<?> testClass) throws Exception;
    }

    /**
     * @param impls folder holding one compiled folder per implementation name
     * @param tests the student's compiled test classes
     */
    static String score(Runner runner, Path impls, Path tests) throws Exception {
        StringBuilder rows = new StringBuilder("[");
        List<Long> times = new ArrayList<>();
        int points = 0;
        boolean correctPassed = false;
        for (int i = 0; i < IMPLEMENTATIONS.length; i++) {
            String name = IMPLEMENTATIONS[i];
            long start = System.nanoTime();
            URL[] urls = {impls.resolve(name).toUri().toURL(), tests.toUri().toURL()};
            Outcome outcome;
            try (URLClassLoader loader = new URLClassLoader(urls, Scoring.class.getClassLoader())) {
                outcome = runner.run(loader.loadClass("ScoreBookTest"));
            }
            long ms = (System.nanoTime() - start) / 1_000_000;
            times.add(ms);
            boolean correct = i == 0;
            if (correct) {
                correctPassed = outcome.failed() == 0 && outcome.passed() > 0;
                points += correctPassed ? 2 : 0;
            } else if (outcome.failed() > 0) {
                points += 3;
            }
            rows.append(i == 0 ? "" : ",").append("{\"implementation\":").append(json(name))
                    .append(",\"passed\":").append(outcome.passed()).append(",\"failed\":").append(outcome.failed())
                    .append(",\"firstFailure\":").append(json(outcome.firstFailure())).append(",\"ms\":").append(ms)
                    .append("}");
        }
        rows.append("]");
        if (!correctPassed) {
            points = 0;
        }
        return "{\"points\":" + points + ",\"runs\":" + rows + ",\"msPerImplementation\":" + times + "}";
    }

    static String json(String s) {
        return s == null ? "null" : "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ") + "\"";
    }

    private Scoring() {
    }
}
