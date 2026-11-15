// A light outline of Java source: the classes, interfaces, records and
// enums in a file and their members, for autocomplete. Not a parser:
// enough to list what a student's own or a question's given classes
// offer, and to survive code that is half-typed.

export type JavaParam = { type: string; name: string };

export type JavaMember = {
  name: string;
  kind: "method" | "field" | "constructor";
  static: boolean;
  visibility: "public" | "protected" | "package" | "private";
  /** The field's type or the method's return type; the class name for a constructor. */
  type: string;
  params: JavaParam[];
};

export type JavaClass = {
  name: string;
  kind: "class" | "interface" | "record" | "enum";
  extends: string[];
  implements: string[];
  members: JavaMember[];
};

const MODIFIERS = new Set([
  "public", "protected", "private", "static", "final", "abstract", "default",
  "synchronized", "native", "transient", "volatile", "strictfp", "sealed", "non-sealed",
]);

/**
 * Comments and string or char literals blanked to spaces (lengths kept),
 * so braces and semicolons inside them cannot confuse the brace counting.
 */
export function blankCommentsAndStrings(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === "//") {
      const end = source.indexOf("\n", i);
      const stop = end === -1 ? source.length : end;
      out += " ".repeat(stop - i);
      i = stop;
    } else if (two === "/*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (source.startsWith('"""', i)) {
      const end = source.indexOf('"""', i + 3);
      const stop = end === -1 ? source.length : end + 3;
      out += '"' + source.slice(i + 1, stop - 1).replace(/[^\n]/g, " ") + '"';
      i = stop;
    } else if (source[i] === '"' || source[i] === "'") {
      const quote = source[i];
      let j = i + 1;
      while (j < source.length && source[j] !== quote && source[j] !== "\n") j += source[j] === "\\" ? 2 : 1;
      const stop = Math.min(j + 1, source.length);
      out += quote + " ".repeat(Math.max(0, stop - i - 2)) + (stop - i >= 2 ? quote : "");
      i = stop;
    } else {
      out += source[i];
      i++;
    }
  }
  return out;
}

/** Index of the brace that closes the one at `open`, or the end of the text. */
function closingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return text.length;
}

/** Splits "A, B<C, D>" at top-level commas. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "<" || ch === "(" || ch === "[") depth++;
    if (ch === ">" || ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** "List<String>" -> "List", keeping array brackets: "String[]". */
export function simpleType(type: string): string {
  const arrays = (type.match(/\[\s*\]/g) ?? []).length + (type.includes("...") ? 1 : 0);
  const base = type.replace(/<[\s\S]*>/, "").replace(/\[\s*\]/g, "").replace("...", "").trim();
  return base.split(".").pop()! + "[]".repeat(arrays);
}

function parseParams(text: string): JavaParam[] {
  return splitTopLevel(text)
    .map((part) => part.replace(/@\w+(\([^)]*\))?\s*/g, "").replace(/\bfinal\s+/, "").trim())
    .map((part) => {
      const match = /^(.*?)\s*(\.\.\.)?\s+([A-Za-z_$][\w$]*)$/.exec(part);
      if (!match) return null;
      return { type: simpleType(match[1] + (match[2] ? "[]" : "")), name: match[3] };
    })
    .filter((p): p is JavaParam => p !== null);
}

const HEADER = /\b(class|interface|record|enum)\s+([A-Za-z_$][\w$]*)\s*(<[^{]*?>)?\s*([^{;]*)\{/g;

/** The classes in one source file, nested ones included, each with its members. */
export function outlineJava(source: string): JavaClass[] {
  const text = blankCommentsAndStrings(source);
  const classes: JavaClass[] = [];
  outlineBlock(text, 0, text.length, classes);
  return classes;
}

function outlineBlock(text: string, from: number, to: number, classes: JavaClass[]) {
  HEADER.lastIndex = from;
  let match: RegExpExecArray | null;
  while ((match = HEADER.exec(text)) && match.index < to) {
    const [, kind, name, , rest] = match;
    const open = match.index + match[0].length - 1;
    const close = closingBrace(text, open);
    const javaClass: JavaClass = {
      name,
      kind: kind as JavaClass["kind"],
      extends: [],
      implements: [],
      members: [],
    };
    // record Point(int x, int y) implements Shape
    let tail = rest;
    if (kind === "record") {
      const components = /^\s*\(([^)]*)\)/.exec(rest);
      if (components) {
        for (const param of parseParams(components[1])) {
          javaClass.members.push({ name: param.name, kind: "method", static: false, visibility: "public", type: param.type, params: [] });
        }
        javaClass.members.push({ name, kind: "constructor", static: false, visibility: "public", type: name, params: parseParams(components[1]) });
        tail = rest.slice(components[0].length);
      }
    }
    const ext = /\bextends\s+([\s\S]*?)(?=\bimplements\b|\bpermits\b|$)/.exec(tail);
    if (ext) javaClass.extends = splitTopLevel(ext[1]).map(simpleType);
    const impl = /\bimplements\s+([\s\S]*?)(?=\bpermits\b|$)/.exec(tail);
    if (impl) javaClass.implements = splitTopLevel(impl[1]).map(simpleType);

    outlineMembers(text, open + 1, close, javaClass, classes);
    classes.push(javaClass);
    HEADER.lastIndex = close + 1;
  }
}

/** The members declared directly in a class body (from..to, inside its braces). */
function outlineMembers(text: string, from: number, to: number, javaClass: JavaClass, classes: JavaClass[]) {
  const inInterface = javaClass.kind === "interface";
  let start = from;
  let i = from;
  while (i < to) {
    const ch = text[i];
    if (ch === "{" || ch === ";") {
      const head = text.slice(start, i).trim();
      if (ch === "{") {
        const close = closingBrace(text, i);
        if (/\b(class|interface|record|enum)\s+[A-Za-z_$]/.test(head)) {
          outlineBlock(text, start, close + 1, classes);
        } else {
          declare(head, javaClass, inInterface);
        }
        i = close + 1;
      } else {
        declare(head, javaClass, inInterface);
        i++;
      }
      start = i;
      continue;
    }
    i++;
  }
}

function declare(head: string, javaClass: JavaClass, inInterface: boolean) {
  const words = head.replace(/@\w+(\([^)]*\))?/g, " ").replace(/\s+/g, " ").trim();
  if (!words || words === "static") return; // an initializer block
  // Modifiers, then the rest of the declaration.
  const tokens = words.split(" ");
  const modifiers = new Set<string>();
  while (tokens.length && MODIFIERS.has(tokens[0])) modifiers.add(tokens.shift()!);
  const rest = tokens.join(" ");
  const visibility: JavaMember["visibility"] = modifiers.has("public")
    ? "public"
    : modifiers.has("protected")
      ? "protected"
      : modifiers.has("private")
        ? "private"
        : inInterface
          ? "public"
          : "package";

  // A field whose value is a call (int total = compute();) is still a field.
  const equals = rest.indexOf("=");
  const paren = rest.indexOf("(");
  const isField = equals !== -1 && (paren === -1 || equals < paren);

  // A method or constructor: [<T>] [Type] name(params) [throws ...]
  const method = isField ? null : /^(?:<[^>]*>\s*)?(?:(.+?)\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/.exec(rest);
  if (method) {
    const [, type, name, params] = method;
    if (!type) {
      if (name === javaClass.name) {
        javaClass.members.push({ name, kind: "constructor", static: false, visibility, type: name, params: parseParams(params) });
      }
      return;
    }
    javaClass.members.push({
      name,
      kind: "method",
      static: modifiers.has("static"),
      visibility,
      type: simpleType(type),
      params: parseParams(params),
    });
    return;
  }

  // Fields: Type a [= ...], b [= ...]
  const field = /^(.+?)\s+([A-Za-z_$][\w$]*)\s*(?:=|,|\[|$)/.exec(rest);
  if (field && !/[=(]/.test(field[1])) {
    const type = simpleType(field[1]);
    const names = splitTopLevel(rest.slice(field[1].length)).map((part) => /^\s*([A-Za-z_$][\w$]*)/.exec(part)?.[1]);
    for (const name of names) {
      if (!name) continue;
      javaClass.members.push({ name, kind: "field", static: modifiers.has("static") || inInterface, visibility, type, params: [] });
    }
  }
  // Enum constants (A, B, C;) are not offered; enums are rare in this course.
}
