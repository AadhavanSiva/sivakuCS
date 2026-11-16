public class Fleet {
    public static String describe(Rental r) {
        if (r instanceof Bike b) {
            return "Bike " + b.getId() + " with " + b.getGears() + " gears";
        }
        if (r instanceof Scooter s) {
            return String.format("Scooter %s at $%.2f an hour", s.getId(), s.getHourlyRate());
        }
        return "Rental " + r.getId();
    }

    public static int countScooters(Rental[] items) {
        int count = 0;
        for (Rental r : items) {
            if (r.getClass() == Scooter.class) {
                count++;
            }
        }
        return count;
    }
}
