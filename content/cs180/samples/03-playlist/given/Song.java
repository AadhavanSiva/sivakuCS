public class Song implements Track {
    private final String title;
    private final int seconds;

    public Song(String title, int seconds) {
        this.title = title;
        this.seconds = seconds;
    }

    @Override
    public String getTitle() {
        return title;
    }

    @Override
    public int getSeconds() {
        return seconds;
    }
}
