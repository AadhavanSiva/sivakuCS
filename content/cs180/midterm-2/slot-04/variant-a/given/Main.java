public class Main {
    public static void main(String[] args) {
        Transaction[] items = {new Purchase("Paint", 24.50), new Refund("Brushes", 6.00), new Purchase("Canvas", 31.25)};
        IO.println("Total: " + Ledger.total(items));
        IO.println("Largest: " + Ledger.largest(items));
    }
}
