/** A ferry ticket for one passenger. */
public class Ticket {

    /**
     * Creates a ticket.
     *
     * @param passenger who the ticket is for
     * @param basePrice the price before any discount
     */
    public Ticket(Passenger passenger, double basePrice) {
    }

    /** @return who the ticket is for */
    public Passenger getPassenger() {
        return null;
    }

    /** @return the price before any discount */
    public double getBasePrice() {
        return 0;
    }

    /** @param basePrice the new price before any discount */
    public void setBasePrice(double basePrice) {
    }

    /** @return the base price, less 25% if the passenger is a senior */
    public double getCost() {
        return 0;
    }

    /** @return the ticket in the form Ticket[passenger=Ana Ruiz, cost=$12.00] */
    @Override
    public String toString() {
        return null;
    }
}
