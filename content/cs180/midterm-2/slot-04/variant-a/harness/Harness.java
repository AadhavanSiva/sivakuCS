import sivaku.harness.Check;

/** Hidden tests for Ledger. Each public static method is one case in tests.json. */
public class Harness {
    private static final double CENT = 1e-9;

    public static void sampleFromTheHandout() {
        Transaction[] items = {new Purchase("Paint", 24.50), new Refund("Brushes", 6.00), new Purchase("Canvas", 31.25)};
        Check.equal("total of the sample", 49.75, Ledger.total(items), CENT);
        Check.equal("largest of the sample", "Canvas", Ledger.largest(items));
    }

    public static void totalOfGivenKinds() {
        Transaction[] items = {new Purchase("Easel", 80.00), new Purchase("Ink", 7.25), new Refund("Frame", 15.00)};
        Check.equal("total", 72.25, Ledger.total(items), CENT);
    }

    public static void totalOfNone() {
        Check.equal("total of an empty array", 0.0, Ledger.total(new Transaction[0]), CENT);
    }

    public static void totalOfRefundsOnly() {
        Transaction[] items = {new Refund("Pens", 4.00), new Refund("Clay", 11.50)};
        Check.equal("total", -15.50, Ledger.total(items), CENT);
    }

    public static void totalWithAnUnseenKind() {
        Transaction[] items = {new Purchase("Pastels", 18.00), new Fee("Card fee", 250)};
        Check.equal("total", 15.50, Ledger.total(items), CENT);
    }

    public static void largestOfGivenKinds() {
        Transaction[] items = {new Purchase("Ink", 7.25), new Purchase("Easel", 80.00), new Refund("Frame", 15.00)};
        Check.equal("largest", "Easel", Ledger.largest(items));
    }

    public static void largestOfNone() {
        Check.equal("largest of an empty array", "", Ledger.largest(new Transaction[0]));
    }

    public static void largestTieFirstWins() {
        Transaction[] items = {new Purchase("Glue", 3.00), new Purchase("Sketchbook", 12.00), new Purchase("Stencils", 12.00)};
        Check.equal("largest when two share it", "Sketchbook", Ledger.largest(items));
    }

    public static void largestAllNegative() {
        Transaction[] items = {new Refund("Pens", 4.00), new Refund("Clay", 1.50), new Refund("Tape", 9.00)};
        Check.equal("largest when all are refunds", "Clay", Ledger.largest(items));
    }

    public static void largestWithAnUnseenKind() {
        Transaction[] items = {new Refund("Pens", 4.00), new Fee("Card fee", 120)};
        Check.equal("largest", "Card fee", Ledger.largest(items));
    }
}
