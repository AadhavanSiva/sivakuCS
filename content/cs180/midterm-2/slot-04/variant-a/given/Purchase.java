/** A sale: money in. */
public class Purchase implements Transaction {
    private final String label;
    private final double amount;

    public Purchase(String label, double amount) {
        this.label = label;
        this.amount = amount;
    }

    @Override
    public String getLabel() {
        return label;
    }

    @Override
    public double getAmount() {
        return amount;
    }
}
