public class Playlist {
    /**
     * The total length of the tracks, in seconds.
     *
     * @param tracks the tracks; may be empty
     * @return the sum of their lengths, or 0 for an empty array
     */
    public static int totalSeconds(Track[] tracks) {
        int total = 0;
        for (Track track : tracks) {
            total += track.getSeconds();
        }
        return total;
    }

    /**
     * The title of the longest track; the first one if several are equally long.
     *
     * @param tracks the tracks; may be empty
     * @return the title, or null for an empty array
     */
    public static String longestTitle(Track[] tracks) {
        Track longest = null;
        for (Track track : tracks) {
            if (longest == null || track.getSeconds() > longest.getSeconds()) {
                longest = track;
            }
        }
        return longest == null ? null : longest.getTitle();
    }
}
