import sivaku.harness.Check;

/** Hidden tests for Dimmer. Each public static method is one case in tests.json. */
public class Harness {
    public static void sampleFromTheHandout() {
        Dimmer lamp = new Dimmer(4);
        Check.equal("level of new Dimmer(4)", 4, lamp.getLevel());
        lamp.brighter();
        Check.equal("level after brighter()", 5, lamp.getLevel());
        lamp.setLevel(9);
        Check.equal("level after setLevel(9)", 9, lamp.getLevel());
    }

    public static void constructorInRange() {
        Check.equal("level", 7, new Dimmer(7).getLevel());
    }

    public static void constructorAboveRange() {
        Check.equal("level", 0, new Dimmer(14).getLevel());
    }

    public static void constructorBelowRange() {
        Check.equal("level", 0, new Dimmer(-3).getLevel());
    }

    public static void setLevelAboveRangeIgnored() {
        Dimmer d = new Dimmer(6);
        d.setLevel(11);
        Check.equal("level", 6, d.getLevel());
    }

    public static void setLevelBelowRangeIgnored() {
        Dimmer d = new Dimmer(6);
        d.setLevel(-1);
        Check.equal("level", 6, d.getLevel());
    }

    public static void boundsAccepted() {
        Dimmer d = new Dimmer(5);
        d.setLevel(10);
        Check.equal("level after setLevel(10)", 10, d.getLevel());
        d.setLevel(0);
        Check.equal("level after setLevel(0)", 0, d.getLevel());
    }

    public static void brighterStopsAt10() {
        Dimmer d = new Dimmer(9);
        d.brighter();
        d.brighter();
        d.brighter();
        Check.equal("level", 10, d.getLevel());
    }

    public static void dimmerStopsAt0() {
        Dimmer d = new Dimmer(1);
        d.dimmer();
        d.dimmer();
        Check.equal("level", 0, d.getLevel());
    }

    public static void upAndDown() {
        Dimmer d = new Dimmer(3);
        d.dimmer();
        d.dimmer();
        d.brighter();
        Check.equal("level", 2, d.getLevel());
    }
}
