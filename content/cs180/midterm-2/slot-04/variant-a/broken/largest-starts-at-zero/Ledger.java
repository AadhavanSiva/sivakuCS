public class Ledger {
    public static double total(Transaction[] items) {
        double total = 0.0;
        for (Transaction item : items) {
            total += item.getAmount();
        }
        return total;
    }

    public static String largest(Transaction[] items) {
        String label = "";
        double largest = 0.0;
        for (Transaction item : items) {
            if (item.getAmount() > largest) {
                largest = item.getAmount();
                label = item.getLabel();
            }
        }
        return label;
    }
}
