/** A scooter for hire, charged by the hour. */
public class Scooter extends Rental {
    private final double hourlyRate;

    public Scooter(String id, double hourlyRate) {
        super(id);
        this.hourlyRate = hourlyRate;
    }

    /** @return the price for one hour, in dollars */
    public double getHourlyRate() {
        return hourlyRate;
    }
}
