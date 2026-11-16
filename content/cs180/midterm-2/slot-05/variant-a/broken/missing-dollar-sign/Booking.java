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

    @Override
    public String toString() {
        return String.format("Booking[guest=%s, nights=%d, rate=%.2f]", guest, nights, nightlyRate);
    }
}
