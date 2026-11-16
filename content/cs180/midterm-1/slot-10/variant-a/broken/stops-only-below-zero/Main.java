void main() {
    int charge = 50;
    while (true) {
        IO.println("Battery: " + charge);
        if (charge < 0) {
            IO.println("The rover is out of power.");
            return;
        }
        IO.println("1) Drive  2) Recharge  3) Park");
        int choice = Integer.parseInt(IO.readln().trim());
        if (choice == 1) {
            charge -= 15;
        } else if (choice == 2) {
            charge = Math.min(charge + 10, 60);
        } else if (choice == 3) {
            IO.println("Final battery: " + charge);
            return;
        } else {
            charge -= 5;
        }
    }
}
