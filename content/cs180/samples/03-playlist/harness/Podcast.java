/** A Track the student has never seen: its length is computed from minutes. */
public class Podcast implements Track {
    private final String name;
    private final int minutes;

    public Podcast(String name, int minutes) {
        this.name = name;
        this.minutes = minutes;
    }

    @Override
    public String getTitle() {
        return name;
    }

    @Override
    public int getSeconds() {
        return minutes * 60;
    }
}
