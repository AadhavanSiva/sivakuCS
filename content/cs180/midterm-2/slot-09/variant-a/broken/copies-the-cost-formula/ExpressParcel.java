public class ExpressParcel extends Parcel {
    private int hours;

    public ExpressParcel(String label, double weightKg, int hours) {
        super(label, weightKg);
        this.hours = hours;
    }

    public int getHours() {
        return hours;
    }

    @Override
    public double getShippingCost() {
        return 4.00 + 1.50 * getWeightKg() + 12.00;
    }

    @Override
    public String toString() {
        return super.toString() + " express within " + hours + " hours";
    }
}
