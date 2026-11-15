import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        System.out.println("Enter your age:");
        int age = Integer.parseInt(in.nextLine().trim());
        System.out.println("Are you a student? (y/n)");
        String answer = in.nextLine().trim();

        double price;
        if (age < 12) {
            price = 6.50;
        } else if (age > 65) {
            price = 7.25;
        } else if (answer.equalsIgnoreCase("y")) {
            price = 8.75;
        } else {
            price = 11.00;
        }
        System.out.printf("Ticket price: $%.2f%n", price);
    }
}
