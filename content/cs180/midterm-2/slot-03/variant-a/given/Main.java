public class Main {
    public static void main(String[] args) {
        Dimmer lamp = new Dimmer(4);
        IO.println("Level: " + lamp.getLevel());
        lamp.brighter();
        IO.println("Level: " + lamp.getLevel());
        lamp.setLevel(9);
        IO.println("Level: " + lamp.getLevel());
    }
}
