// Runs CheerpJ (a JVM compiled to WebAssembly) in a Web Worker, so a student
// program that never ends cannot freeze the page: the page stops it by
// terminating this worker and starting a fresh one.
//
// Messages in:  { id, op: "run", files, inputFiles, stdin, mainClass }
// Messages out: { type: "ready", info, ms }       JVM loaded, Run will work
//               { type: "warm", ms }              compiler warmed up
//               { type: "fatal", message }        the JVM could not start
//               { id, type: "phase", phase }      "compiling", then "running"
//               { id, type: "result", compile, run, files }
//               { id, type: "error", message }
importScripts("https://cjrtnc.leaningtech.com/5.0/loader.js");

// The program's working directory. CheerpJ resolves java.io relative paths
// (new PrintWriter("out.txt")) against /files/ whatever user.dir says, so
// user.dir is set to match and java.nio paths agree with java.io ones.
const WORK = "/files";
// The sandbox's own sources and classes, kept inside WORK but left alone
// when WORK is cleared between runs.
const OWN = ".sivaku";
const SRC = `${WORK}/${OWN}/src`;
const CLASSES = `${WORK}/${OWN}/classes`;

let Sandbox;

const ready = (async () => {
  const started = performance.now();
  await cheerpjInit({ version: 25, status: "none", javaProperties: [`user.dir=${WORK}`] });
  const lib = await cheerpjRunLibrary("/app/cheerpj/sandbox.jar");
  Sandbox = await lib.sivaku.sandbox.Sandbox;
  const info = JSON.parse(await Sandbox.info());
  postMessage({ type: "ready", info, ms: Math.round(performance.now() - started) });
})();

// One job at a time: runs share the source, class and working directories.
let queue = ready.then(warmUp, (e) => {
  postMessage({ type: "fatal", message: describe(e) });
  throw e;
});

// javac is several times slower on its first compiles than afterwards, so
// pay that cost before the student presses Run. The warm-up program uses
// what course programs typically do (file I/O, Scanner, collections,
// String.format, inheritance, an interface, pattern matching), so the
// compiler has already loaded those parts of itself and the library.
const WARM_UP_SOURCE = `import java.io.*;
import java.util.*;

interface Shape { double area(); }

class Base implements Shape {
    private final String name;
    Base(String name) { this.name = name; }
    public double area() { return 0; }
    public String getName() { return name; }
    @Override public String toString() { return String.format("%s %.2f", name, area()); }
}

class Square extends Base {
    private final double side;
    Square(double side) { super("square"); this.side = side; }
    @Override public double area() { return side * side; }
}

public class Warm {
    public static void main(String[] args) throws IOException {
        Scanner in = new Scanner(System.in);
        List<Shape> shapes = new ArrayList<>();
        shapes.add(new Square(in.hasNextInt() ? in.nextInt() : 2));
        Map<String, Integer> counts = new HashMap<>();
        try (PrintWriter out = new PrintWriter(new FileWriter("warm.txt"));
             BufferedReader reader = new BufferedReader(new StringReader("a b"))) {
            for (Shape s : shapes) {
                if (s instanceof Square sq) out.println(sq);
                counts.merge(s.getClass().getSimpleName(), 1, Integer::sum);
            }
            String line = reader.readLine();
            IO.println(line == null ? "" : line.toUpperCase() + counts);
        } catch (IllegalArgumentException | NullPointerException e) {
            System.err.println(e.getMessage());
        }
        int[] values = {3, 1, 2};
        Arrays.sort(values);
        StringBuilder text = new StringBuilder();
        for (int v : values) text.append(Integer.parseInt(String.valueOf(v))).append(Math.max(v, 0));
        System.out.printf("%d%n", text.length());
    }
}
`;

async function warmUp() {
  const started = performance.now();
  await Sandbox.reset(`${WORK}/${OWN}/warm-src`);
  await Sandbox.writeFile(`${WORK}/${OWN}/warm-src/Warm.java`, WARM_UP_SOURCE);
  await Sandbox.compile(`${WORK}/${OWN}/warm-src`, `${WORK}/${OWN}/warm-classes`);
  postMessage({ type: "warm", ms: Math.round(performance.now() - started) });
}

function describe(e) {
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return String(e);
}

const safeName = (name) =>
  /^[A-Za-z0-9_.\-/]+$/.test(name) && !name.split("/").some((part) => part === ".." || part === OWN);

async function run({ id, files = {}, inputFiles = {}, stdin = "", mainClass = "Main" }) {
  for (const name of [...Object.keys(files), ...Object.keys(inputFiles)]) {
    if (!safeName(name)) throw new Error(`Not a valid file name: ${name}`);
  }

  postMessage({ id, type: "phase", phase: "compiling" });
  await Sandbox.reset(SRC);
  await Sandbox.reset(CLASSES);
  for (const [name, text] of Object.entries(files)) {
    await Sandbox.writeFile(`${SRC}/${name}`, text);
  }
  const compile = JSON.parse(await Sandbox.compile(SRC, CLASSES));
  if (!compile.ok) {
    postMessage({ id, type: "result", compile, run: null, files: {} });
    return;
  }

  await Sandbox.clearExcept(WORK, OWN);
  for (const [name, text] of Object.entries(inputFiles)) {
    await Sandbox.writeFile(`${WORK}/${name}`, text);
  }
  postMessage({ id, type: "phase", phase: "running" });
  const result = JSON.parse(await Sandbox.run(CLASSES, mainClass, stdin));
  const after = JSON.parse(await Sandbox.readTree(WORK, OWN));
  postMessage({ id, type: "result", compile, run: result, files: after });
}

onmessage = (event) => {
  if (event.data.op !== "run") return;
  queue = queue.then(() => run(event.data)).catch((e) => {
    postMessage({ id: event.data.id, type: "error", message: describe(e) });
  });
};
