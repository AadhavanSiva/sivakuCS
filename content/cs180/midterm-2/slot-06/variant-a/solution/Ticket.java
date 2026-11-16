/** A ferry ticket for one passenger. */
public class Ticket {
    private Passenger passenger;
    private double basePrice;

    /**
     * Creates a ticket.
     *
     * @param passenger who the ticket is for
     * @param basePrice the price before any discount
     */
    public Ticket(Passenger passenger, double basePrice) {
        this.passenger = passenger;
        this.basePrice = basePrice;
    }

    /** @return who the ticket is for */
    public Passenger getPassenger() {
        return passenger;
    }

    /** @return the price before any discount */
    public double getBasePrice() {
        return basePrice;
    }

    /** @param basePrice the new price before any discount */
    public void setBasePrice(double basePrice) {
        this.basePrice = basePrice;
    }

    /** @return the base price, less 25% if the passenger is a senior */
    public double getCost() {
        if (passenger.isSenior()) {
            return basePrice * 0.75;
        }
        return basePrice;
    }

    /** @return the ticket in the form Ticket[passenger=Ana Ruiz, cost=$12.00] */
    @Override
    public String toString() {
        return String.format("Ticket[passenger=%s, cost=$%.2f]", passenger.getName(), getCost());
    }
}
