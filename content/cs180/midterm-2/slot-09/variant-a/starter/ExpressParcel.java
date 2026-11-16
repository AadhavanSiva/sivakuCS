/** A parcel delivered within a set number of hours. */
public class ExpressParcel extends Parcel {

    /**
     * Creates an express parcel.
     *
     * @param label what the parcel holds
     * @param weightKg its weight, in kilograms
     * @param hours the number of hours it is delivered within
     */
    public ExpressParcel(String label, double weightKg, int hours) {
    }

    /** @return the number of hours the parcel is delivered within */
    public int getHours() {
        return 0;
    }

    /** @return the parcel's shipping cost plus 12.00 */
    @Override
    public double getShippingCost() {
        return 0;
    }

    /** @return the parcel's description and its hours, such as Parcel Books (2.0 kg) express within 24 hours */
    @Override
    public String toString() {
        return null;
    }
}
