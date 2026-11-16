// Milestone 3, part 2: autocomplete in the editor. Typing a dot shows the
// reference sheet's methods and the question's own classes' members.
import { expect, test, type Page } from "@playwright/test";
import { openExam } from "./helpers";

const EXAM = "/exams/cs180/samples";

test.use({ viewport: { width: 1366, height: 768 } });

type MonacoForTests = {
  editor: {
    getEditors(): {
      getModel(): { uri: { path: string }; getValue(): string; setValue(text: string): void } | null;
      setPosition(position: { lineNumber: number; column: number }): void;
      focus(): void;
    }[];
  };
};

/** Puts `text` in the open editor and the cursor at the end of the line holding `atEndOf`. */
async function editAt(page: Page, text: string, atEndOf: string) {
  await page.waitForFunction(() => (window as unknown as { sivakuMonaco?: MonacoForTests }).sivakuMonaco?.editor.getEditors().length);
  await page.evaluate(
    ([t, marker]) => {
      const editor = (window as unknown as { sivakuMonaco: MonacoForTests }).sivakuMonaco.editor.getEditors()[0];
      editor.getModel()!.setValue(t);
      const lines = t.split("\n");
      const lineIndex = lines.findIndex((line) => line.includes(marker));
      editor.setPosition({ lineNumber: lineIndex + 1, column: lines[lineIndex].indexOf(marker) + marker.length + 1 });
      editor.focus();
    },
    [text, atEndOf] as const,
  );
}

const suggestions = (page: Page) => page.locator(".suggest-widget.visible .monaco-list-row");

async function suggestionLabels(page: Page) {
  await expect(suggestions(page).first()).toBeVisible();
  return (await suggestions(page).locator(".label-name").allTextContents()).map((s) => s.trim());
}

async function editorText(page: Page) {
  return page.evaluate(() => (window as unknown as { sivakuMonaco: MonacoForTests }).sivakuMonaco.editor.getEditors()[0].getModel()!.getValue());
}

test.beforeEach(async ({ page }) => {
  await page.goto("/exams");
  await page.evaluate(() => window.localStorage.clear());
});

test("a dot after a class name offers the reference sheet's methods; picking one inserts only its name", async ({ page }) => {
  await openExam(page, `${EXAM}#1`);
  await editAt(page, "void main() {\n    int age = Integer\n}\n", "Integer");
  await page.keyboard.type(".");
  expect(await suggestionLabels(page)).toEqual(["parseInt"]);
  // The parameters show in the dropdown...
  await expect(suggestions(page).first()).toContainText("parseInt(s)");
  await expect(page.locator(".suggest-widget.visible")).toContainText("Integer.parseInt(s)");

  // ...but only the name is inserted.
  await page.keyboard.press("Enter");
  expect(await editorText(page)).toContain("    int age = Integer.parseInt\n");
  await page.keyboard.type("(IO.readln())");
  expect(await editorText(page)).toContain("int age = Integer.parseInt(IO.readln())");
});

test("picking IO.println inserts only the name", async ({ page }) => {
  await openExam(page, `${EXAM}#4`);
  await editAt(page, "void main() {\n    IO\n}\n", "IO");
  await page.keyboard.type(".printl");
  await expect(suggestions(page).first()).toContainText("println(x)");
  await page.keyboard.press("Enter");
  expect(await editorText(page)).toBe("void main() {\n    IO.println\n}\n");
});

test("picking a given class's method inserts only the name", async ({ page }) => {
  await openExam(page, `${EXAM}#3`);
  await editAt(page, "public class Playlist {\n    void f(Track t) {\n        t\n    }\n}\n", "        t");
  await page.keyboard.type(".getT");
  await expect(suggestions(page).first()).toContainText("getTitle()");
  await page.keyboard.press("Enter");
  expect(await editorText(page)).toContain("        t.getTitle\n");
});

test("a dot after a String variable offers String's methods", async ({ page }) => {
  await openExam(page, `${EXAM}#1`);
  await editAt(page, 'void main() {\n    String answer = IO.readln();\n    if (answer\n}\n', "if (answer");
  await page.keyboard.type(".");
  const labels = await suggestionLabels(page);
  expect(labels).toEqual(expect.arrayContaining(["equalsIgnoreCase", "length", "trim", "split", "isEmpty"]));
  expect(labels).not.toContain("format");
  // Typing narrows the list.
  await page.keyboard.type("equ");
  expect(await suggestionLabels(page)).toEqual(["equalsIgnoreCase"]);
});

test("IO offers println, print and readln", async ({ page }) => {
  await openExam(page, `${EXAM}#4`);
  await editAt(page, "void main() {\n    IO\n}\n", "IO");
  await page.keyboard.type(".");
  expect(new Set(await suggestionLabels(page))).toEqual(new Set(["print", "println", "readln"]));
});

test("the question's given classes offer their members", async ({ page }) => {
  await openExam(page, `${EXAM}#3`);
  await editAt(
    page,
    "public class Playlist {\n    public static int totalSeconds(Track[] tracks) {\n        int first = tracks[0]\n        return 0;\n    }\n}\n",
    "tracks[0]",
  );
  await page.keyboard.type(".");
  expect(await suggestionLabels(page)).toEqual(["getSeconds", "getTitle"]);
  await expect(page.locator(".suggest-widget.visible")).toContainText("int getSeconds()");
});
