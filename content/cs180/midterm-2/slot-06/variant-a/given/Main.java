public class Main {
    public static void main(String[] args) {
        Passenger ana = new Passenger("Ana Ruiz", false);
        Passenger joe = new Passenger("Joe Banks", true);
        IO.println(new Ticket(ana, 16.00).toString());
        IO.println(new Ticket(joe, 16.00).toString());
    }
}
