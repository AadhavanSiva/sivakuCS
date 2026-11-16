public class Ledger {
    /**
     * The sum of the transactions' amounts.
     *
     * @param items the transactions; may be empty
     * @return the sum, or 0.0 for an empty array
     */
    public static double total(Transaction[] items) {
        double total = 0.0;
        for (Transaction item : items) {
            total += item.getAmount();
        }
        return total;
    }

    /**
     * The label of the transaction with the largest amount; the first one if several share it.
     *
     * @param items the transactions; may be empty
     * @return the label, or "" for an empty array
     */
    public static String largest(Transaction[] items) {
        if (items.length == 0) {
            return "";
        }
        Transaction largest = items[0];
        for (Transaction item : items) {
            if (item.getAmount() > largest.getAmount()) {
                largest = item;
            }
        }
        return largest.getLabel();
    }
}
