public class Fleet {
    public static String describe(Rental r) {
        String kind = r.getClass().getSimpleName();
        if (kind.equals("Bike")) {
            return "Bike " + r.getId() + " with " + ((Bike) r).getGears() + " gears";
        }
        if (kind.equals("Scooter")) {
            return String.format("Scooter %s at $%.2f an hour", r.getId(), ((Scooter) r).getHourlyRate());
        }
        return "Rental " + r.getId();
    }

    public static int countScooters(Rental[] items) {
        int count = 0;
        for (Rental r : items) {
            if (r.getClass().getSimpleName().equals("Scooter")) {
                count++;
            }
        }
        return count;
    }
}
