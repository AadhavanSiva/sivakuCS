/** A parcel to be shipped. */
public class Parcel {
    private final String label;
    private final double weightKg;

    public Parcel(String label, double weightKg) {
        this.label = label;
        this.weightKg = weightKg;
    }

    public String getLabel() {
        return label;
    }

    public double getWeightKg() {
        return weightKg;
    }

    /** @return 4.00 plus 1.50 for each kilogram */
    public double getShippingCost() {
        return 4.00 + 1.50 * weightKg;
    }

    /** @return the parcel's description, such as Parcel Books (2.0 kg) */
    @Override
    public String toString() {
        return String.format("Parcel %s (%.1f kg)", label, weightKg);
    }
}
