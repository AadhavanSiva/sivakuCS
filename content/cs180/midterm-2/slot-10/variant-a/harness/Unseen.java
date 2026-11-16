/** Rentals the student has never seen, for the hidden cases. */
class ElectricScooter extends Scooter {
    private final int rangeKm;

    ElectricScooter(String id, double hourlyRate, int rangeKm) {
        super(id, hourlyRate);
        this.rangeKm = rangeKm;
    }

    int getRangeKm() {
        return rangeKm;
    }
}

class MountainBike extends Bike {
    MountainBike(String id, int gears) {
        super(id, gears);
    }
}

class Kayak extends Rental {
    Kayak(String id) {
        super(id);
    }
}

public class Unseen {
    private Unseen() {
    }
}
