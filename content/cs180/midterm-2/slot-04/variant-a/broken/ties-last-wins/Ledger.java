public class Ledger {
    public static double total(Transaction[] items) {
        double total = 0.0;
        for (Transaction item : items) {
            total += item.getAmount();
        }
        return total;
    }

    public static String largest(Transaction[] items) {
        if (items.length == 0) {
            return "";
        }
        Transaction largest = items[0];
        for (Transaction item : items) {
            if (item.getAmount() >= largest.getAmount()) {
                largest = item;
            }
        }
        return largest.getLabel();
    }
}
