/** A seedling for sale at a garden centre. */
public class Seedling {
    private static int count = 0;

    private String name;
    private int heightCm;

    /**
     * Creates a seedling.
     *
     * @param name the seedling's name
     * @param heightCm its height, in centimetres
     */
    public Seedling(String name, int heightCm) {
        this.name = name;
        this.heightCm = heightCm;
        count++;
    }

    /** @return the seedling's name */
    public String getName() {
        return name;
    }

    /** @return the seedling's height, in centimetres */
    public int getHeightCm() {
        return heightCm;
    }

    /** @param heightCm the seedling's new height, in centimetres */
    public void setHeightCm(int heightCm) {
        this.heightCm = heightCm;
    }

    /** @return true if the seedling is at least 15 centimetres tall */
    public boolean isReadyToPlant() {
        return heightCm >= 15;
    }

    /** @return how many Seedling objects have been created */
    public static int getCount() {
        return count;
    }
}
