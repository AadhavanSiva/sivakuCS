public class Main {
    public static void main(String[] args) {
        Track[] tracks = {new Song("Intro", 90), new Song("Theme", 210), new Song("Outro", 45)};
        IO.println("Total: " + Playlist.totalSeconds(tracks) + " seconds");
        IO.println("Longest: " + Playlist.longestTitle(tracks));
    }
}
