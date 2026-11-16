public class Dimmer {
    private int level;

    public Dimmer(int level) {
        setLevel(level);
    }

    public int getLevel() {
        return level;
    }

    public void setLevel(int level) {
        if (level > 0 && level < 10) {
            this.level = level;
        }
    }

    public void brighter() {
        if (level < 10) {
            level++;
        }
    }

    public void dimmer() {
        if (level > 0) {
            level--;
        }
    }
}
