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
        return super.getShippingCost() + 12.00;
    }

    @Override
    public String toString() {
        return String.format("Parcel %s (%.1f kg)", getLabel(), getWeightKg()) + " express within " + hours + " hours";
    }
}
