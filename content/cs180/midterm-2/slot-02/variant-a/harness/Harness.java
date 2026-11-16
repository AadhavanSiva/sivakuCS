import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import sivaku.harness.Check;

/** Hidden tests for Seedling. Each public static method is one case in tests.json. */
public class Harness {
    public static void sampleFromTheHandout() {
        int before = Seedling.getCount();
        Seedling basil = new Seedling("Basil", 12);
        Seedling fern = new Seedling("Fern", 20);
        Check.equal("basil's name", "Basil", basil.getName());
        Check.equal("basil's height", 12, basil.getHeightCm());
        Check.equal("basil ready to plant", false, basil.isReadyToPlant());
        Check.equal("fern ready to plant", true, fern.isReadyToPlant());
        Check.equal("seedlings created by the sample", 2, Seedling.getCount() - before);
    }

    public static void name() {
        Check.equal("name", "Sweet pea", new Seedling("Sweet pea", 9).getName());
    }

    public static void height() {
        Check.equal("height", 31, new Seedling("Lupin", 31).getHeightCm());
    }

    public static void setter() {
        Seedling s = new Seedling("Thyme", 4);
        s.setHeightCm(18);
        Check.equal("height after setHeightCm(18)", 18, s.getHeightCm());
    }

    public static void readyAtExactly15() {
        Check.equal("ready at 15 cm", true, new Seedling("Chive", 15).isReadyToPlant());
    }

    public static void notReadyAt14() {
        Check.equal("ready at 14 cm", false, new Seedling("Chive", 14).isReadyToPlant());
    }

    public static void readyFollowsTheSetter() {
        Seedling s = new Seedling("Sage", 22);
        s.setHeightCm(10);
        Check.equal("ready after shrinking to 10 cm", false, s.isReadyToPlant());
        s.setHeightCm(16);
        Check.equal("ready after growing to 16 cm", true, s.isReadyToPlant());
    }

    public static void countsEveryObject() {
        int before = Seedling.getCount();
        new Seedling("A", 1);
        new Seedling("B", 2);
        new Seedling("C", 3);
        Check.equal("seedlings created", 3, Seedling.getCount() - before);
    }

    public static void fieldsArePrivate() {
        for (Field field : Seedling.class.getDeclaredFields()) {
            Check.isTrue("field " + field.getName() + " is private", Modifier.isPrivate(field.getModifiers()));
        }
    }
}
