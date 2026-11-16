/** A seedling for sale at a garden centre. */
public class Seedling {
    private static int count = 0;

    private String name;
    private int heightCm;

    public Seedling(String name, int heightCm) {
        this.name = name;
        this.heightCm = heightCm;
        count = 1;
    }

    public String getName() {
        return name;
    }

    public int getHeightCm() {
        return heightCm;
    }

    public void setHeightCm(int heightCm) {
        this.heightCm = heightCm;
    }

    public boolean isReadyToPlant() {
        return heightCm >= 15;
    }

    public static int getCount() {
        return count;
    }
}
