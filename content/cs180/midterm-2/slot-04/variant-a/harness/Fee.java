/** A Transaction the student has never seen: a charge taken from the account, stored in cents. */
public class Fee implements Transaction {
    private final String what;
    private final int cents;

    public Fee(String what, int cents) {
        this.what = what;
        this.cents = cents;
    }

    @Override
    public String getLabel() {
        return what;
    }

    @Override
    public double getAmount() {
        return -cents / 100.0;
    }
}
