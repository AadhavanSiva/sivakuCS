import sivaku.harness.Check;

/** Hidden tests for Ticket. Each public static method is one case in tests.json. */
public class Harness {
    private static final double CENT = 1e-9;

    public static void sampleFromTheHandout() {
        Check.equal("toString of Ana's ticket", "Ticket[passenger=Ana Ruiz, cost=$16.00]",
                new Ticket(new Passenger("Ana Ruiz", false), 16.00).toString());
        Check.equal("toString of Joe's ticket", "Ticket[passenger=Joe Banks, cost=$12.00]",
                new Ticket(new Passenger("Joe Banks", true), 16.00).toString());
    }

    public static void holdsTheSamePassenger() {
        Passenger p = new Passenger("Ivy Chen", false);
        Check.isTrue("getPassenger() returns the passenger given to the constructor", new Ticket(p, 9.0).getPassenger() == p);
    }

    public static void basePrice() {
        Check.equal("base price", 22.40, new Ticket(new Passenger("Ivy Chen", true), 22.40).getBasePrice(), CENT);
    }

    public static void setBasePrice() {
        Ticket t = new Ticket(new Passenger("Ivy Chen", false), 10.0);
        t.setBasePrice(13.5);
        Check.equal("base price after setBasePrice(13.5)", 13.5, t.getBasePrice(), CENT);
    }

    public static void costFullPrice() {
        Check.equal("cost", 18.0, new Ticket(new Passenger("Leo Grant", false), 18.0).getCost(), CENT);
    }

    public static void costSenior() {
        Check.equal("cost", 13.5, new Ticket(new Passenger("Leo Grant", true), 18.0).getCost(), CENT);
    }

    public static void costFollowsThePassenger() {
        Passenger p = new Passenger("Rosa Diaz", false);
        Ticket t = new Ticket(p, 20.0);
        p.setSenior(true);
        Check.equal("cost after the passenger becomes a senior", 15.0, t.getCost(), CENT);
    }

    public static void costFollowsThePassengerBack() {
        Passenger p = new Passenger("Rosa Diaz", true);
        Ticket t = new Ticket(p, 20.0);
        p.setSenior(false);
        Check.equal("cost after the passenger stops being a senior", 20.0, t.getCost(), CENT);
    }

    public static void toStringFullPrice() {
        Check.equal("toString", "Ticket[passenger=Leo Grant, cost=$7.25]",
                new Ticket(new Passenger("Leo Grant", false), 7.25).toString());
    }

    public static void toStringRoundsTheCost() {
        Check.equal("toString", "Ticket[passenger=Leo Grant, cost=$7.49]",
                new Ticket(new Passenger("Leo Grant", true), 9.99).toString());
    }

    public static void toStringAfterChanges() {
        Passenger p = new Passenger("Nia Brooks", false);
        Ticket t = new Ticket(p, 10.0);
        t.setBasePrice(30.0);
        p.setSenior(true);
        Check.equal("toString after both change", "Ticket[passenger=Nia Brooks, cost=$22.50]", t.toString());
    }
}
