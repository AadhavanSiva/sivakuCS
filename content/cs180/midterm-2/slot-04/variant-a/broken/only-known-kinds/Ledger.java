public class Ledger {
    public static double total(Transaction[] items) {
        double total = 0.0;
        for (Transaction item : items) {
            if (item instanceof Purchase || item instanceof Refund) {
                total += item.getAmount();
            }
        }
        return total;
    }

    public static String largest(Transaction[] items) {
        String label = "";
        Transaction largest = null;
        for (Transaction item : items) {
            if (!(item instanceof Purchase || item instanceof Refund)) {
                continue;
            }
            if (largest == null || item.getAmount() > largest.getAmount()) {
                largest = item;
                label = item.getLabel();
            }
        }
        return label;
    }
}
