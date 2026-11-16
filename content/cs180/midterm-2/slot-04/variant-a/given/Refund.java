/** Money paid back to a customer: its amount is negative. */
public class Refund implements Transaction {
    private final String label;
    private final double paidBack;

    public Refund(String label, double paidBack) {
        this.label = label;
        this.paidBack = paidBack;
    }

    @Override
    public String getLabel() {
        return label;
    }

    @Override
    public double getAmount() {
        return -paidBack;
    }
}
