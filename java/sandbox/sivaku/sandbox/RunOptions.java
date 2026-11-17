package sivaku.sandbox;

/**
 * How to run, from the options string the page passes ("swing;warmUp=Warmup"):
 *
 * <ul>
 *   <li>{@code swing}: load the run's classes with Swing renamed to the fakes;</li>
 *   <li>{@code warmUp=Class}: before the run, call {@code Class.warmUp()} in the
 *       same class loader with its output discarded. CheerpJ can kill a thread
 *       the first time several threads run the same code together; a thread
 *       question's warm-up runs the student's methods once on one thread;</li>
 *   <li>{@code swingPanel=Class} (runInteractive only): instead of main, build
 *       that panel and let the page draw it; implies swing.</li>
 * </ul>
 */
record RunOptions(boolean swing, String warmUp, String swingPanel) {
    static RunOptions parse(String options) {
        boolean swing = false;
        String warmUp = null;
        String swingPanel = null;
        for (String part : options.split(";")) {
            String[] kv = part.trim().split("=", 2);
            switch (kv[0]) {
                case "swing" -> swing = true;
                case "warmUp" -> warmUp = kv.length > 1 && !kv[1].isEmpty() ? kv[1] : null;
                case "swingPanel" -> {
                    swingPanel = kv.length > 1 && !kv[1].isEmpty() ? kv[1] : null;
                    swing = true;
                }
                default -> {
                    // unknown or empty: ignored
                }
            }
        }
        return new RunOptions(swing, warmUp, swingPanel);
    }
}
