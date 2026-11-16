public class Main {
    public static void main(String[] args) {
        ExpressParcel books = new ExpressParcel("Books", 2.0, 24);
        IO.println(books.toString());
        IO.println(String.format("Cost: $%.2f", books.getShippingCost()));
    }
}
