/** A bike for hire. */
public class Bike extends Rental {
    private final int gears;

    public Bike(String id, int gears) {
        super(id);
        this.gears = gears;
    }

    public int getGears() {
        return gears;
    }
}
