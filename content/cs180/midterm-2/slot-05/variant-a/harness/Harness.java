import sivaku.harness.Check;

/** Hidden tests for Booking.toString. Each public static method is one case in tests.json. */
public class Harness {
    public static void sampleFromTheHandout() {
        Check.equal("toString of the sample booking", "Booking[guest=Ana Ruiz, nights=3, rate=$89.50]",
                new Booking("Ana Ruiz", 3, 89.5).toString());
    }

    public static void basic() {
        Check.equal("toString", "Booking[guest=Tom Okafor, nights=2, rate=$120.00]", new Booking("Tom Okafor", 2, 120).toString());
    }

    public static void oneDecimalRate() {
        Check.equal("toString", "Booking[guest=Li Wei, nights=4, rate=$64.30]", new Booking("Li Wei", 4, 64.3).toString());
    }

    public static void roundedRate() {
        Check.equal("toString", "Booking[guest=Sam Hart, nights=1, rate=$75.00]", new Booking("Sam Hart", 1, 74.999).toString());
    }

    public static void afterSetNights() {
        Booking b = new Booking("Mia Cole", 2, 95.0);
        b.setNights(6);
        Check.equal("toString after setNights(6)", "Booking[guest=Mia Cole, nights=6, rate=$95.00]", b.toString());
    }

    public static void afterSetNightlyRate() {
        Booking b = new Booking("Mia Cole", 2, 95.0);
        b.setNightlyRate(110.25);
        Check.equal("toString after setNightlyRate(110.25)", "Booking[guest=Mia Cole, nights=2, rate=$110.25]", b.toString());
    }

    public static void afterSetGuest() {
        Booking b = new Booking("Mia Cole", 2, 95.0);
        b.setGuest("Raj Patel");
        Check.equal("toString after setGuest", "Booking[guest=Raj Patel, nights=2, rate=$95.00]", b.toString());
    }

    public static void zeroRate() {
        Check.equal("toString", "Booking[guest=Guest, nights=1, rate=$0.00]", new Booking("Guest", 1, 0).toString());
    }

    public static void largeRate() {
        Check.equal("toString", "Booking[guest=Eve Long, nights=14, rate=$1234.50]", new Booking("Eve Long", 14, 1234.5).toString());
    }

    public static void twiceInARow() {
        Booking b = new Booking("Ada Moss", 3, 80.0);
        b.toString();
        b.setNights(5);
        b.setNightlyRate(82.4);
        Check.equal("toString after both setters", "Booking[guest=Ada Moss, nights=5, rate=$82.40]", b.toString());
    }
}
