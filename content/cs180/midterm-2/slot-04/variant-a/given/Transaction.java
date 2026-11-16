/** Money in or out of an art shop's account. */
public interface Transaction {
    /** @return what the transaction was for */
    String getLabel();

    /** @return the amount in dollars; negative for money paid back */
    double getAmount();
}
