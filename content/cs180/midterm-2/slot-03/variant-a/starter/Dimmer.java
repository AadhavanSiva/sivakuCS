/** A light dimmer with a level from 0 to 10. */
public class Dimmer {

    /**
     * Creates a dimmer, setting its level with setLevel.
     *
     * @param level the starting level
     */
    public Dimmer(int level) {
    }

    /** @return the level, from 0 to 10 */
    public int getLevel() {
        return 0;
    }

    /**
     * Sets the level; a level outside 0 to 10 is ignored.
     *
     * @param level the new level
     */
    public void setLevel(int level) {
    }

    /** Raises the level by 1, but not above 10. */
    public void brighter() {
    }

    /** Lowers the level by 1, but not below 0. */
    public void dimmer() {
    }
}
