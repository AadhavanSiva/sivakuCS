# Playlist

`Track` is an interface for anything that can be played: it has a title and a length in seconds.
`Song` is one class that implements it. Other classes may implement it too, and your methods must work with any of them.

In `Playlist.java`, write two static methods:

- `totalSeconds(Track[] tracks)` returns the total length of all the tracks. An empty array has a total of 0.
- `longestTitle(Track[] tracks)` returns the title of the longest track. If two or more tracks are equally long, return the title of the first of them. For an empty array, return `null`.

`Main.java` shows the methods in use; you can run it, but you cannot change it.

## Sample

For songs "Intro" (90 seconds), "Theme" (210 seconds) and "Outro" (45 seconds):

- `totalSeconds` returns `345`
- `longestTitle` returns `"Theme"`

The sample is one of the tests. The rest are hidden.
