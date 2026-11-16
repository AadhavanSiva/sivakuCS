public class Fleet {
    /**
     * Describes a rental by its kind, such as Bike B7 with 21 gears,
     * Scooter S2 at $3.50 an hour, or Rental T1.
     *
     * @param r the rental
     * @return its description
     */
    public static String describe(Rental r) {
        if (r instanceof Bike b) {
            return "Bike " + b.getId() + " with " + b.getGears() + " gears";
        }
        if (r instanceof Scooter s) {
            return String.format("Scooter %s at $%.2f an hour", s.getId(), s.getHourlyRate());
        }
        return "Rental " + r.getId();
    }

    /**
     * @param items the rentals; may be empty
     * @return how many of them are scooters
     */
    public static int countScooters(Rental[] items) {
        int count = 0;
        for (Rental r : items) {
            if (r instanceof Scooter) {
                count++;
            }
        }
        return count;
    }
}
