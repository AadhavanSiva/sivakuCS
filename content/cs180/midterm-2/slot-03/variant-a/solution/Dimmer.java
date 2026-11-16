/** A light dimmer with a level from 0 to 10. */
public class Dimmer {
    private int level;

    /**
     * Creates a dimmer, setting its level with setLevel.
     *
     * @param level the starting level
     */
    public Dimmer(int level) {
        setLevel(level);
    }

    /** @return the level, from 0 to 10 */
    public int getLevel() {
        return level;
    }

    /**
     * Sets the level; a level outside 0 to 10 is ignored.
     *
     * @param level the new level
     */
    public void setLevel(int level) {
        if (level >= 0 && level <= 10) {
            this.level = level;
        }
    }

    /** Raises the level by 1, but not above 10. */
    public void brighter() {
        if (level < 10) {
            level++;
        }
    }

    /** Lowers the level by 1, but not below 0. */
    public void dimmer() {
        if (level > 0) {
            level--;
        }
    }
}
