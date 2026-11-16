public class Fleet {
    public static String describe(Rental r) {
        if (r instanceof Bike b) {
            return "Bike " + b.getId() + " with " + b.getGears() + " gears";
        }
        if (r instanceof Scooter s) {
            return "Scooter " + s.getId() + " at $" + s.getHourlyRate() + " an hour";
        }
        return "Rental " + r.getId();
    }

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
