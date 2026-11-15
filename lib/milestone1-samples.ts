// Programs for the Milestone 1 lab page and its acceptance test. Files are
// written in the page's "=== Name.java ===" format; see splitFiles.

export const CHECK_PROGRAM = `=== Main.java ===
import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;

public class Main {
    static String describe(Person p) {
        if (p instanceof Student s) {
            return String.format("%s studies %s (GPA %.2f)", s.getName(), s.getMajor(), s.getGpa());
        }
        return p.getName() + " is a visitor";
    }

    public static void main(String[] args) throws IOException {
        String name = IO.readln("Name: ");
        String major = IO.readln("Major: ");
        double gpa = Double.parseDouble(IO.readln("GPA: "));

        List<Person> people = new ArrayList<>();
        people.add(new Student(name, major, gpa));
        try (BufferedReader in = new BufferedReader(new FileReader("visitors.txt"))) {
            String line;
            while ((line = in.readLine()) != null) {
                people.add(new Person(line.trim()));
            }
        }

        try (PrintWriter out = new PrintWriter("roster.txt")) {
            for (Person p : people) {
                out.println(describe(p));
            }
        }

        try (BufferedReader in = new BufferedReader(new FileReader("roster.txt"))) {
            String line;
            int n = 0;
            while ((line = in.readLine()) != null) {
                IO.println(++n + ". " + line);
            }
        }
    }
}

=== Person.java ===
public class Person {
    private final String name;

    public Person(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }
}

=== Student.java ===
public class Student extends Person {
    private final String major;
    private final double gpa;

    public Student(String name, String major, double gpa) {
        super(name);
        this.major = major;
        this.gpa = gpa;
    }

    public String getMajor() {
        return major;
    }

    public double getGpa() {
        return gpa;
    }
}
`;

export const CHECK_STDIN = "Ada\nComputer Science\n3.9\n";

export const CHECK_INPUT_FILES = `=== visitors.txt ===
Grace
Linus
`;

export const CHECK_EXPECTED_STDOUT =
  "Name: Major: GPA: 1. Ada studies Computer Science (GPA 3.90)\n" +
  "2. Grace is a visitor\n" +
  "3. Linus is a visitor\n";

export const CHECK_EXPECTED_ROSTER =
  "Ada studies Computer Science (GPA 3.90)\nGrace is a visitor\nLinus is a visitor\n";

export const INFINITE_LOOP_PROGRAM = `=== Main.java ===
public class Main {
    public static void main(String[] args) {
        long count = 0;
        while (true) {
            count++;
        }
    }
}
`;
