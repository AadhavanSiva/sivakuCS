// Milestone 3, part 2: the autocomplete engine on its own (no browser):
// what the reference sheet and the question's classes offer after a dot.
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { completeAt, declaredType, type CompletionContext } from "../lib/autocomplete/complete";
import { outlineJava } from "../lib/autocomplete/java-outline";
import { parseReferenceSheet } from "../lib/autocomplete/reference-api";

const SHEET = readFileSync("content/cs180/samples/reference.md", "utf8");
const api = parseReferenceSheet(SHEET);
const given = (name: string) => readFileSync(`content/cs180/samples/03-playlist/given/${name}`, "utf8");

const PERSON = `public class Person {
    private final String name;
    protected int age;
    public Person(String name) { this.name = name; }
    public String getName() { return name; }
}
`;
const STUDENT = `public class Student extends Person {
    private String major;
    private static int count = 0;
    public Student(String name, String major) { super(name); this.major = major; count++; }
    public String getMajor() { return major; }
    public static int getCount() { return count; }
    @Override
    public String toString() { return getName() + " studies " + major; }
}
`;

const context = (files: Record<string, string> = {}): CompletionContext => ({ api, files });
const labels = (text: string, files?: Record<string, string>) => {
  const result = completeAt(text, context(files));
  return result === null ? null : result.map((s) => s.label).sort();
};

test.describe("the reference sheet", () => {
  test("lists static methods, instance methods by receiver, and constructors", () => {
    const by = (owner: string, kind: string) =>
      api.filter((m) => m.owner === owner && m.kind === kind).map((m) => `${m.static ? "static " : ""}${m.name}(${m.params.join(", ")})`);
    expect(by("IO", "method")).toEqual(["static println(x)", "static print(x)", "static readln()", "static readln(prompt)"]);
    expect(by("Integer", "method")).toEqual(["static parseInt(s)"]);
    expect(by("String", "method")).toEqual(
      expect.arrayContaining(["static format(format, ...)", "length()", "trim()", "split(\" \")", "equalsIgnoreCase(t)"]),
    );
    expect(by("BufferedReader", "method")).toEqual(["readLine()"]);
    expect(by("PrintWriter", "method")).toEqual(["println(x)"]);
    expect(by("File", "method")).toEqual(["exists()"]);
    expect(api.filter((m) => m.kind === "constructor").map((m) => m.owner).sort()).toEqual(
      ["BufferedReader", "File", "FileReader", "PrintWriter"],
    );
    const parseInt = api.find((m) => m.name === "parseInt")!;
    expect(parseInt.doc).toContain("Text to a number");
    expect(parseInt.returns).toBe("int");
  });

  test("has no Scanner and no System.out", () => {
    expect(api.some((m) => m.owner === "Scanner" || m.owner === "System")).toBe(false);
  });
});

test.describe("the Java outline", () => {
  test("finds classes, supertypes and members with their visibility", () => {
    const [student] = outlineJava(STUDENT);
    expect(student.name).toBe("Student");
    expect(student.extends).toEqual(["Person"]);
    const members = student.members.map((m) => `${m.visibility} ${m.static ? "static " : ""}${m.kind} ${m.type} ${m.name}`);
    expect(members).toEqual([
      "private field String major",
      "private static field int count",
      "public constructor Student Student",
      "public method String getMajor",
      "public static method int getCount",
      "public method String toString",
    ]);
    const [track] = outlineJava(given("Track.java"));
    expect(track.kind).toBe("interface");
    expect(track.members.map((m) => `${m.visibility} ${m.name}`)).toEqual(["public getTitle", "public getSeconds"]);
  });

  test("is not fooled by braces in strings and comments", () => {
    const [c] = outlineJava('class A {\n  String s = "{ not a block }"; // }\n  /* { */ int n() { return 1; }\n}\n');
    expect(c.members.map((m) => m.name)).toEqual(["s", "n"]);
  });
});

test.describe("completing after a dot", () => {
  test("a class name offers its static methods from the sheet", () => {
    expect(labels("int n = Integer.")).toEqual(["parseInt"]);
    expect(labels("double d = Double.par")).toEqual(["parseDouble"]);
    expect(labels("    IO.")).toEqual(["print", "println", "readln", "readln"]);
    expect(labels("String t = String.")).toEqual(["format"]);
  });

  test("a String variable offers String's instance methods, not its static ones", () => {
    const got = labels('String s = IO.readln();\nint n = s.');
    expect(got).toEqual(expect.arrayContaining(["equalsIgnoreCase", "isEmpty", "length", "split", "trim"]));
    expect(got).not.toContain("format");
  });

  test("types follow literals, chains, arrays and for-each variables", () => {
    expect(labels('"abc".')).toEqual(expect.arrayContaining(["length", "trim"]));
    expect(labels("String s = IO.readln();\ns.trim().")).toEqual(expect.arrayContaining(["length", "split"]));
    expect(labels('String[] words = IO.readln().split(" ");\nint n = words.')).toEqual(["length"]);
    expect(labels('String[] words = IO.readln().split(" ");\nwords[0].')).toEqual(expect.arrayContaining(["length", "trim"]));
    expect(labels('for (String word : words) {\n    word.')).toEqual(expect.arrayContaining(["length"]));
    expect(labels("var line = reader.readLine();\nBufferedReader reader = null;\nreader.")).toEqual(["readLine"]);
  });

  test("the question's own classes offer their members, inherited ones included", () => {
    const files = { "Person.java": PERSON, "Student.java": STUDENT };
    const main = "void main() {\n    Student s1 = new Student(\"Ada\", \"CS\");\n    s1.";
    // age is protected: visible in the same package, which students' classes share.
    expect(labels(main, files)).toEqual(["age", "getMajor", "getName", "toString"]);
    // Statics through the class name; private ones are hidden outside the class.
    expect(labels("int n = Student.", files)).toEqual(["getCount"]);
    expect(labels("Person p = null;\nif (p instanceof Student st) {\n    st.", files)).toEqual(["age", "getMajor", "getName", "toString"]);
  });

  test("inside a class, this. offers its private members too", () => {
    // The text before the cursor, inside Student's constructor; the editor
    // passes the whole file as well.
    const before = STUDENT.slice(0, STUDENT.indexOf("count++;")) + "this.";
    expect(labels(before, { "Person.java": PERSON, "Student.java": STUDENT })).toEqual([
      "age",
      "getMajor",
      "getName",
      "major",
      "toString",
    ]);
  });

  test("given files: an interface type offers the interface's methods", () => {
    const files = { "Track.java": given("Track.java"), "Song.java": given("Song.java") };
    expect(labels("public static int total(Track[] tracks) {\n    tracks[0].", files)).toEqual(["getSeconds", "getTitle"]);
    expect(labels('Song song = new Song("a", 1);\nsong.', files)).toEqual(["getSeconds", "getTitle"]);
  });

  test("method suggestions insert a call with parameter placeholders", () => {
    const [parseInt] = completeAt("Integer.", context())!;
    expect(parseInt.insertText).toBe("parseInt(${1:s})");
    expect(parseInt.snippet).toBe(true);
    expect(parseInt.detail).toBe("Integer.parseInt(s)");
    // By type, whatever the sheet calls its receiver.
    const [equalsIgnoreCase] = completeAt("String line = IO.readln();\nline.", context())!.filter((x) => x.label === "equalsIgnoreCase");
    expect(equalsIgnoreCase.detail).toBe("String.equalsIgnoreCase(t)");
    const ctor = completeAt("PrintWriter w = new ", context())!.find((x) => x.label === "PrintWriter")!;
    expect(ctor.detail).toBe("new PrintWriter(name)");
    const [song] = completeAt("Song s = null; s.", context({ "Song.java": given("Song.java") }))!
      .filter((x) => x.label === "getTitle");
    expect(song.detail).toBe("String getTitle()");
  });

  test("after new, the constructors", () => {
    const got = labels("PrintWriter out = new ", { "Song.java": given("Song.java") });
    expect(got).toEqual(expect.arrayContaining(["BufferedReader", "File", "FileReader", "PrintWriter", "Song"]));
  });

  test("nothing where there is nothing to complete", () => {
    expect(labels("int x = 5")).toBeNull();
    expect(labels("// Integer.")).toBeNull();
    expect(labels('String s = "Integer.')).toBeNull();
    expect(labels("unknownThing.")).toBeNull();
    expect(labels("int n = 3;\nn.")).toBeNull();
  });

  test("declarations are found where they are made", () => {
    expect(declaredType("count", "private static int count = 0;")).toBe("int");
    expect(declaredType("names", "List<String> names = new ArrayList<>();")).toBe("List");
    expect(declaredType("grid", "int[][] grid = new int[3][4];")).toBe("int[][]");
    expect(declaredType("p", "var p = new Person(\"x\");")).toBe("Person");
  });
});
