// Runs CheerpJ (a JVM compiled to WebAssembly) in a Web Worker, so a student
// program that never ends cannot freeze the page: the page stops it by
// terminating this worker and starting a fresh one.
//
// The worker only relays calls to the static methods of
// sivaku.sandbox.Sandbox; what to call and in what order lives in
// lib/java (shared with `npm run verify`, which calls the same methods on
// a local JDK).
//
// Messages in:  { id, method, args }              one Sandbox call
//               { type: "input", line }           a line typed into the Run
//                                                 console (null: end of input)
// Messages out: { type: "phase", name, ms }        a start-up step done (see phase below)
//               { type: "ready", info, ms }       JVM loaded
//               { type: "warm", ms }              compiler warmed up
//               { type: "fatal", message }        the JVM could not start
//               { id, type: "started" }           the call began executing
//               { id, type: "output", stream, text }   runInteractive output
//               { id, type: "input-wait" }        runInteractive is waiting
//               { id, type: "input-resumed" }     ... and got its line
//               { id, type: "result", value }     its return value
//               { id, type: "error", message }    it threw
// Start-up steps, timed from when the worker began, so a start that stalls
// says where: { type: "phase", name, ms }. Steps: loader, init, library, class.
const workerStarted = performance.now();
const phase = (name) => postMessage({ type: "phase", name, ms: Math.round(performance.now() - workerStarted) });

importScripts("https://cjrtnc.leaningtech.com/5.0/loader.js");
phase("loader");

// The program's working directory. CheerpJ resolves java.io relative paths
// (new PrintWriter("out.txt")) against /files/ whatever user.dir says, so
// user.dir is set to match and java.nio paths agree with java.io ones.
// Must match BROWSER_PATHS in lib/java/browser-java.ts.
const WORK = "/files";
const OWN = ".sivaku";

const METHODS = new Set([
  "info", "reset", "clearExcept", "writeFile", "readFile", "readTree",
  "compile", "compileWith", "run", "runWith", "runInteractive", "runInteractiveWith",
  "callHarness", "callHarnessWith", "runTests",
]);

let Sandbox;

// The interactive run in progress: its call id, lines typed ahead of the
// program asking for them, and the program's pending read, if any.
let interactiveId = null;
let typedAhead = [];
let waitingForLine = null;

function nextLine() {
  if (typedAhead.length > 0) return Promise.resolve(typedAhead.shift());
  return new Promise((resolve) => (waitingForLine = resolve));
}

// Native methods of sivaku.sandbox.Sandbox, used by runInteractive. A Java
// thread calling one waits until the returned Promise settles.
const natives = {
  async Java_sivaku_sandbox_Sandbox_hostWrite(lib, stream, text) {
    postMessage({ id: interactiveId, type: "output", stream, text });
  },
  async Java_sivaku_sandbox_Sandbox_hostReadLine() {
    postMessage({ id: interactiveId, type: "input-wait" });
    const line = await nextLine();
    postMessage({ id: interactiveId, type: "input-resumed" });
    return line;
  },
};

const ready = (async () => {
  const started = performance.now();
  await cheerpjInit({ version: 25, status: "none", javaProperties: [`user.dir=${WORK}`], natives });
  phase("init");
  const lib = await cheerpjRunLibrary("/app/cheerpj/sandbox.jar");
  phase("library");
  Sandbox = await lib.sivaku.sandbox.Sandbox;
  phase("class");
  const info = JSON.parse(await Sandbox.info());
  postMessage({ type: "ready", info, ms: Math.round(performance.now() - started) });
})();

// One call at a time, in order: calls share directories and System streams.
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

onmessage = (event) => {
  // Typed input goes straight to the running program, not into the queue
  // behind it.
  if (event.data.type === "input") {
    const line = event.data.line ?? null;
    if (waitingForLine) {
      const resolve = waitingForLine;
      waitingForLine = null;
      resolve(line);
    } else {
      typedAhead.push(line);
    }
    return;
  }

  const { id, method, args = [] } = event.data;
  queue = queue
    .then(async () => {
      if (!METHODS.has(method)) throw new Error(`Unknown sandbox method: ${method}`);
      if (method === "runInteractive" || method === "runInteractiveWith") interactiveId = id;
      postMessage({ id, type: "started" });
      try {
        const value = await Sandbox[method](...args.map(String));
        postMessage({ id, type: "result", value: value == null ? null : String(value) });
      } finally {
        // Lines typed while the program compiled wait for it, as in a
        // terminal; whatever it never read is dropped when it ends.
        if (method === "runInteractive" || method === "runInteractiveWith") {
          typedAhead = [];
          waitingForLine = null;
        }
      }
    })
    .catch((e) => postMessage({ id, type: "error", message: describe(e) }));
};
