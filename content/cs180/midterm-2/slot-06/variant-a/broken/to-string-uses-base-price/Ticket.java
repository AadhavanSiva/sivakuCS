public class Ticket {
    private Passenger passenger;
    private double basePrice;

    public Ticket(Passenger passenger, double basePrice) {
        this.passenger = passenger;
        this.basePrice = basePrice;
    }

    public Passenger getPassenger() {
        return passenger;
    }

    public double getBasePrice() {
        return basePrice;
    }

    public void setBasePrice(double basePrice) {
        this.basePrice = basePrice;
    }

    public double getCost() {
        if (passenger.isSenior()) {
            return basePrice * 0.75;
        }
        return basePrice;
    }

    @Override
    public String toString() {
        return String.format("Ticket[passenger=%s, cost=$%.2f]", passenger.getName(), basePrice);
    }
}
