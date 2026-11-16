import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import sivaku.harness.Check;

/**
 * Hidden tests for ExpressParcel. Each public static method is one case in
 * tests.json. The cases marked "against": "other-parcel" run with
 * alternates/other-parcel/Parcel.java in place of the given Parcel, so
 * their expected values come from that version.
 */
public class Harness {
    private static final double CENT = 1e-9;

    public static void sampleFromTheHandout() {
        ExpressParcel books = new ExpressParcel("Books", 2.0, 24);
        Check.equal("toString of the sample", "Parcel Books (2.0 kg) express within 24 hours", books.toString());
        Check.equal("cost of the sample", 19.00, books.getShippingCost(), CENT);
    }

    public static void hours() {
        Check.equal("hours", 48, new ExpressParcel("Plates", 3.0, 48).getHours());
    }

    public static void labelFromParcel() {
        Check.equal("label", "Plates", new ExpressParcel("Plates", 3.0, 48).getLabel());
    }

    public static void cost() {
        Check.equal("cost of a 3 kg parcel", 20.50, new ExpressParcel("Plates", 3.0, 48).getShippingCost(), CENT);
    }

    public static void costOfNothing() {
        Check.equal("cost of a 0 kg parcel", 16.00, new ExpressParcel("Letter", 0.0, 4).getShippingCost(), CENT);
    }

    public static void description() {
        Check.equal("toString", "Parcel Lamp (1.5 kg) express within 6 hours", new ExpressParcel("Lamp", 1.5, 6).toString());
    }

    public static void costAsAParcel() {
        Parcel p = new ExpressParcel("Rug", 4.0, 12);
        Check.equal("cost through a Parcel variable", 22.00, p.getShippingCost(), CENT);
    }

    public static void descriptionAsAParcel() {
        Parcel p = new ExpressParcel("Rug", 4.0, 12);
        Check.equal("toString through a Parcel variable", "Parcel Rug (4.0 kg) express within 12 hours", p.toString());
    }

    public static void oneNewPrivateField() {
        Field[] fields = ExpressParcel.class.getDeclaredFields();
        Check.equal("number of fields ExpressParcel adds", 1, fields.length);
        Check.isTrue("the field is private", Modifier.isPrivate(fields[0].getModifiers()));
    }

    // Against alternates/other-parcel: cost 5.00 + 2.00 per kg; toString Parcel[label=..., weight=...kg].

    public static void otherParcelCost() {
        Check.equal("cost of a 3 kg parcel", 23.00, new ExpressParcel("Plates", 3.0, 48).getShippingCost(), CENT);
    }

    public static void otherParcelDescription() {
        Check.equal("toString", "Parcel[label=Lamp, weight=1.5kg] express within 6 hours", new ExpressParcel("Lamp", 1.5, 6).toString());
    }

    public static void otherParcelCostOfNothing() {
        Check.equal("cost of a 0 kg parcel", 17.00, new ExpressParcel("Letter", 0.0, 4).getShippingCost(), CENT);
    }

    public static void otherParcelAsAParcel() {
        Parcel p = new ExpressParcel("Rug", 4.0, 12);
        Check.equal("toString through a Parcel variable", "Parcel[label=Rug, weight=4.0kg] express within 12 hours", p.toString());
    }

    public static void otherParcelCostAsAParcel() {
        Parcel p = new ExpressParcel("Rug", 2.5, 12);
        Check.equal("cost through a Parcel variable", 22.00, p.getShippingCost(), CENT);
    }
}
