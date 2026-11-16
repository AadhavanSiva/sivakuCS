import sivaku.harness.Check;

/** Hidden tests for Fleet. Each public static method is one case in tests.json. */
public class Harness {
    public static void sampleFromTheHandout() {
        Rental[] fleet = {new Bike("B7", 21), new Scooter("S2", 3.5), new Rental("T1")};
        Check.equal("description of the bike", "Bike B7 with 21 gears", Fleet.describe(fleet[0]));
        Check.equal("description of the scooter", "Scooter S2 at $3.50 an hour", Fleet.describe(fleet[1]));
        Check.equal("description of the other rental", "Rental T1", Fleet.describe(fleet[2]));
        Check.equal("scooters in the sample", 1, Fleet.countScooters(fleet));
    }

    public static void describeBike() {
        Check.equal("description", "Bike B12 with 7 gears", Fleet.describe(new Bike("B12", 7)));
    }

    public static void describeScooter() {
        Check.equal("description", "Scooter S9 at $4.25 an hour", Fleet.describe(new Scooter("S9", 4.25)));
    }

    public static void scooterRateRounded() {
        Check.equal("description", "Scooter S1 at $2.50 an hour", Fleet.describe(new Scooter("S1", 2.499)));
    }

    public static void describePlainRental() {
        Check.equal("description", "Rental U5", Fleet.describe(new Rental("U5")));
    }

    public static void describeUnseenRental() {
        Check.equal("description", "Rental K1", Fleet.describe(new Kayak("K1")));
    }

    public static void describeUnseenScooter() {
        Check.equal("description", "Scooter E3 at $5.00 an hour", Fleet.describe(new ElectricScooter("E3", 5.0, 30)));
    }

    public static void describeUnseenBike() {
        Check.equal("description", "Bike M4 with 24 gears", Fleet.describe(new MountainBike("M4", 24)));
    }

    public static void countNone() {
        Check.equal("scooters in an empty array", 0, Fleet.countScooters(new Rental[0]));
    }

    public static void countMixed() {
        Rental[] items = {new Scooter("S1", 3.0), new Bike("B1", 5), new Scooter("S2", 3.0), new Rental("T1")};
        Check.equal("scooters", 2, Fleet.countScooters(items));
    }

    public static void countUnseenScooters() {
        Rental[] items = {new ElectricScooter("E1", 6.0, 25), new Scooter("S1", 3.0), new Kayak("K2")};
        Check.equal("scooters", 2, Fleet.countScooters(items));
    }

    public static void countWithoutScooters() {
        Rental[] items = {new Bike("B1", 5), new MountainBike("M1", 18), new Kayak("K1")};
        Check.equal("scooters", 0, Fleet.countScooters(items));
    }

    public static void countAllScooters() {
        Rental[] items = {new Scooter("S1", 3.0), new Scooter("S2", 3.5), new ElectricScooter("E1", 6.0, 40)};
        Check.equal("scooters", 3, Fleet.countScooters(items));
    }

    public static void scooterWholeRate() {
        Check.equal("description", "Scooter S7 at $10.00 an hour", Fleet.describe(new Scooter("S7", 10)));
    }
}
