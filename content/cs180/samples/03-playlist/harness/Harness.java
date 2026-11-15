import sivaku.harness.Check;

/** Hidden tests for Playlist. Each public static method is one case in tests.json. */
public class Harness {
    private static Track[] sample() {
        return new Track[] {new Song("Intro", 90), new Song("Theme", 210), new Song("Outro", 45)};
    }

    public static void sampleFromTheHandout() {
        Check.equal("total of the sample songs", 345, Playlist.totalSeconds(sample()));
        Check.equal("longest of the sample songs", "Theme", Playlist.longestTitle(sample()));
    }

    public static void emptyTotal() {
        Check.equal("total of no tracks", 0, Playlist.totalSeconds(new Track[0]));
    }

    public static void emptyLongest() {
        Check.equal("longest of no tracks", null, Playlist.longestTitle(new Track[0]));
    }

    public static void tieFirstWins() {
        Track[] tracks = {new Song("Short", 60), new Song("First long", 200), new Song("Second long", 200)};
        Check.equal("longest when two tie", "First long", Playlist.longestTitle(tracks));
    }

    public static void otherTrackKinds() {
        Track[] tracks = {new Song("Opener", 240), new Podcast("Episode 12", 45), new Song("Closer", 180)};
        Check.equal("total with a podcast", 240 + 45 * 60 + 180, Playlist.totalSeconds(tracks));
        Check.equal("longest with a podcast", "Episode 12", Playlist.longestTitle(tracks));
    }

    public static void singleTrack() {
        Track[] tracks = {new Podcast("Only", 2)};
        Check.equal("total of one track", 120, Playlist.totalSeconds(tracks));
        Check.equal("longest of one track", "Only", Playlist.longestTitle(tracks));
    }

    public static void longestLast() {
        Track[] tracks = {new Song("A", 10), new Song("B", 20), new Song("C", 30), new Song("D", 31)};
        Check.equal("longest at the end", "D", Playlist.longestTitle(tracks));
        Check.equal("total of four", 91, Playlist.totalSeconds(tracks));
    }
}
