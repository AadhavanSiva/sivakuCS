public class Main {
    public static void main(String[] args) {
        Seedling basil = new Seedling("Basil", 12);
        Seedling fern = new Seedling("Fern", 20);
        IO.println(basil.getName() + " " + basil.getHeightCm() + " " + basil.isReadyToPlant());
        IO.println(fern.getName() + " " + fern.getHeightCm() + " " + fern.isReadyToPlant());
        IO.println("Created: " + Seedling.getCount());
    }
}
