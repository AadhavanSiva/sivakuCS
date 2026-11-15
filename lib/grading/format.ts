import type { GradeResult } from "./types";

/** The header above the test cases, as on the real exam: "TESTCASES   3 / 14 passed, 2 points". */
export function testcasesHeader(result: GradeResult): string {
  const points = `${result.score} ${result.score === 1 ? "point" : "points"}`;
  return `TESTCASES   ${result.passed} / ${result.total} passed, ${points}`;
}
