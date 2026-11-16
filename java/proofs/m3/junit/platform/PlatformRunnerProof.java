import static org.junit.platform.engine.discovery.DiscoverySelectors.selectClass;

import java.nio.file.Path;
import org.junit.platform.launcher.Launcher;
import org.junit.platform.launcher.LauncherDiscoveryRequest;
import org.junit.platform.launcher.core.LauncherDiscoveryRequestBuilder;
import org.junit.platform.launcher.core.LauncherFactory;
import org.junit.platform.launcher.listeners.SummaryGeneratingListener;
import org.junit.platform.launcher.listeners.TestExecutionSummary;

/**
 * Midterm 3 proof 3a: the real JUnit Platform (junit-platform-console-standalone
 * on the class path). Reports how long the first run takes, which includes
 * loading JUnit, and how long later runs take.
 *
 * <p>args: implementations folder, model tests folder, starter tests folder.
 */
public class PlatformRunnerProof {
    static Scoring.Outcome run(Class<?> testClass) {
        LauncherDiscoveryRequest request = LauncherDiscoveryRequestBuilder.request()
                .selectors(selectClass(testClass))
                .build();
        Launcher launcher = LauncherFactory.create();
        SummaryGeneratingListener listener = new SummaryGeneratingListener();
        launcher.execute(request, listener);
        TestExecutionSummary summary = listener.getSummary();
        String first = summary.getFailures().isEmpty() ? null
                : summary.getFailures().get(0).getTestIdentifier().getDisplayName() + ": "
                        + summary.getFailures().get(0).getException();
        return new Scoring.Outcome((int) summary.getTestsSucceededCount(), (int) summary.getTestsFailedCount(), first);
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            // The sandbox passes no arguments; the browser test sends them as lines of input.
            args = new String(System.in.readAllBytes()).trim().split("\\R");
        }
        long start = System.nanoTime();
        String model = Scoring.score(PlatformRunnerProof::run, Path.of(args[0]), Path.of(args[1]));
        long modelMs = (System.nanoTime() - start) / 1_000_000;
        start = System.nanoTime();
        String starter = Scoring.score(PlatformRunnerProof::run, Path.of(args[0]), Path.of(args[2]));
        long starterMs = (System.nanoTime() - start) / 1_000_000;
        System.out.println("{\"runner\":\"platform\",\"model\":" + model + ",\"modelMs\":" + modelMs
                + ",\"starter\":" + starter + ",\"starterMs\":" + starterMs + "}");
    }
}
