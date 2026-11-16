/** A guest's stay at a guesthouse. */
public class Booking {
    private String guest;
    private int nights;
    private double nightlyRate;

    public Booking(String guest, int nights, double nightlyRate) {
        this.guest = guest;
        this.nights = nights;
        this.nightlyRate = nightlyRate;
    }

    public String getGuest() {
        return guest;
    }

    public void setGuest(String guest) {
        this.guest = guest;
    }

    public int getNights() {
        return nights;
    }

    public void setNights(int nights) {
        this.nights = nights;
    }

    public double getNightlyRate() {
        return nightlyRate;
    }

    public void setNightlyRate(double nightlyRate) {
        this.nightlyRate = nightlyRate;
    }

    /**
     * The booking as text, for example Booking[guest=Ana Ruiz, nights=3, rate=$89.50].
     *
     * @return the booking's guest, nights and nightly rate
     */
    @Override
    public String toString() {
        return String.format("Booking[guest=%s, nights=%d, rate=$%.2f]", guest, nights, nightlyRate);
    }
}
