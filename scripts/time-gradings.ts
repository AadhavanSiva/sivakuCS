// Times one grading of the starter and of each correct and broken solution
// of a question, per case, on the local JDK: npx tsx scripts/time-gradings.ts <question folder>
import { resolve } from "node:path";
import {
  loadBrokenVariants,
  loadOtherSolutions,
  loadQuestion,
  loadSolution,
} from "../lib/content/load";
import { gradeQuestion } from "../lib/grading/grade";
import { LocalJava } from "./lib/local-java";

const dir = resolve(process.argv[2]);
const question = loadQuestion(dir);
async function main() {
  const java = new LocalJava();
  try {
    const all = {
      "starter/": question.starter,
      "solution/": loadSolution(dir),
      ...loadOtherSolutions(dir),
      ...loadBrokenVariants(dir),
    };
    for (const [name, files] of Object.entries(all)) {
      const times: string[] = [];
      for (const testCase of question.tests.cases) {
        const one = {
          ...question,
          tests: { ...question.tests, cases: [testCase] },
        };
        const started = Date.now();
        const graded = await gradeQuestion(java, one, files);
        times.push(
          `${testCase.name.replace("Sample from the handout", "S")} ${Date.now() - started}${graded.passed ? "" : "✗"}`,
        );
      }
      console.log(`${name.padEnd(36)} ${times.join("  ")}`);
    }
  } finally {
    await java.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
