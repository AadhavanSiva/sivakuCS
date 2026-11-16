/** A ferry passenger. */
public class Passenger {
    private final String name;
    private boolean senior;

    public Passenger(String name, boolean senior) {
        this.name = name;
        this.senior = senior;
    }

    public String getName() {
        return name;
    }

    /** @return true if the passenger travels at the senior rate */
    public boolean isSenior() {
        return senior;
    }

    public void setSenior(boolean senior) {
        this.senior = senior;
    }
}
