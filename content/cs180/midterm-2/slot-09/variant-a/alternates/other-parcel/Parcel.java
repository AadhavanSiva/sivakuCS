/**
 * The same Parcel API, written differently (never shown to the student):
 * hidden cases compile ExpressParcel against this to show it calls super
 * rather than copying Parcel's formula and format.
 */
public class Parcel {
    private final String name;
    private final int grams;

    public Parcel(String label, double weightKg) {
        this.name = label;
        this.grams = (int) Math.round(weightKg * 1000);
    }

    public String getLabel() {
        return name;
    }

    public double getWeightKg() {
        return grams / 1000.0;
    }

    public double getShippingCost() {
        return 5.00 + 2.00 * getWeightKg();
    }

    @Override
    public String toString() {
        return "Parcel[label=" + name + ", weight=" + getWeightKg() + "kg]";
    }
}
