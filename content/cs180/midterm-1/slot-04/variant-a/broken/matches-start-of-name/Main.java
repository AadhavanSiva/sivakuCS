void main() {
    String[] stops = {"Quayside", "Millbrook", "Ferndale", "Copper Hill",
                      "Ashgrove", "Lantern Square", "Redcliff", "Northgate"};
    IO.println("Enter a stop name:");
    String name = IO.readln().toLowerCase();

    int number = -1;
    for (int i = 0; i < stops.length; i++) {
        if (stops[i].toLowerCase().startsWith(name)) {
            number = i + 1;
            break;
        }
    }

    if (number == -1) {
        IO.println("Stop number: unknown");
        IO.println("Fare zone: unknown");
        return;
    }
    String zone;
    if (number <= 3) {
        zone = "inner";
    } else if (number <= 6) {
        zone = "middle";
    } else {
        zone = "outer";
    }
    IO.println("Stop number: " + number);
    IO.println("Fare zone: " + zone);
}
