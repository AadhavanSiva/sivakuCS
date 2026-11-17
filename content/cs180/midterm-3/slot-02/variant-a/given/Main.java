// Complete: you do not need to open or change this file.

void main() {
    SeedBank bank = new SeedBank(new MemoryTally());
    bank.add(12);
    IO.println("Took 5: " + bank.take(5));
    IO.println("Took 20: " + bank.take(20));
    IO.println("Count: " + bank.count());
}
