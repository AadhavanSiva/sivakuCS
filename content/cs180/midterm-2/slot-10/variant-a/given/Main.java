public class Main {
    public static void main(String[] args) {
        Rental[] fleet = {new Bike("B7", 21), new Scooter("S2", 3.5), new Rental("T1")};
        for (Rental r : fleet) {
            IO.println(Fleet.describe(r));
        }
        IO.println("Scooters: " + Fleet.countScooters(fleet));
    }
}
