/** Anything that can be played: it has a title and a length. */
public interface Track {
    String getTitle();

    /** The length of the track, in seconds. */
    int getSeconds();
}
