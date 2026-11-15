// Completions after "." (and after "new "), from the exam's reference sheet
// and the classes in the question's files. Pure: the editor passes in the
// text before the cursor and gets suggestions back.
import { blankCommentsAndStrings, type JavaClass, type JavaMember, outlineJava } from "./java-outline";
import type { ApiMember } from "./reference-api";

export type Suggestion = {
  label: string;
  kind: "method" | "field" | "constructor";
  /** What to insert; a snippet with ${1:param} placeholders when snippet is true. */
  insertText: string;
  snippet: boolean;
  /** One line shown beside the label: "Integer.parseInt(s)", "String getTitle()". */
  detail: string;
  documentation?: string;
  /** Reference-sheet items first, then the question's own classes. */
  sortText: string;
};

export type CompletionContext = {
  /** The exam's reference sheet. */
  api: ApiMember[];
  /** Every Java file of the question (given and the student's), for their classes. */
  files: Record<string, string>;
};

const PRIMITIVES = new Set(["int", "long", "double", "float", "char", "boolean", "byte", "short", "void"]);

/** An expression's type: an instance of a class, the class itself (for static members), or unknown. */
type Resolved = { type: string; staticContext: boolean } | null;

/** Completions at the end of `textBefore`, or null when this is not a member access or `new`. */
export function completeAt(textBefore: string, context: CompletionContext): Suggestion[] | null {
  // Strings and comments blanked so their contents never look like code;
  // the expression just before the cursor is read from this.
  const code = blankCommentsAndStrings(textBefore);
  const isNew = /\bnew\s+[A-Za-z_$]*$/.test(code);
  const access = isNew ? null : /\.\s*[A-Za-z_$]*$/.exec(code);
  // Most keystrokes are neither; leave those to the editor's own suggestions
  // before doing any work.
  if (!isNew && !access) return null;

  const classes = Object.entries(context.files)
    .filter(([name]) => name.endsWith(".java"))
    .flatMap(([, text]) => outlineCached(text));
  const known = new KnownTypes(context.api, classes);

  // new Pla| -> constructors
  if (isNew) return known.constructors();

  // receiver.| or receiver.partial|
  if (!access) return null;
  // Read from the original text, so a string literal is recognised.
  const expression = expressionBefore(textBefore, access.index);
  if (!expression) return null;
  const resolved = resolve(expression, code.slice(0, access.index), known);
  if (!resolved) return null;
  return known.membersOf(resolved.type, resolved.staticContext, enclosingClass(code, classes));
}

/** Outlines by file text: other files rarely change while one is being typed in. */
const outlines = new Map<string, JavaClass[]>();
function outlineCached(text: string): JavaClass[] {
  let classes = outlines.get(text);
  if (!classes) {
    classes = outlineJava(text);
    if (outlines.size > 50) outlines.clear();
    outlines.set(text, classes);
  }
  return classes;
}

/**
 * The expression that ends just before the dot at `dot`: a chain of links
 * separated by dots, each a name (or, first, a string literal) followed by
 * any (...) or [...], e.g. `words[0].trim()` or `"hi".toUpperCase()`.
 */
function expressionBefore(text: string, dot: number): string | null {
  const skipSpaces = (i: number) => {
    while (i >= 0 && /\s/.test(text[i])) i--;
    return i;
  };
  /** Index of the ( or [ that opens the group closing at i, or -1. */
  const groupStart = (i: number) => {
    const close = text[i];
    const open = close === ")" ? "(" : "[";
    let depth = 0;
    for (; i >= 0; i--) {
      if (text[i] === close) depth++;
      else if (text[i] === open && --depth === 0) return i;
    }
    return -1;
  };

  let i = skipSpaces(dot - 1);
  const end = i + 1;
  for (;;) {
    while (i >= 0 && (text[i] === ")" || text[i] === "]")) {
      const open = groupStart(i);
      if (open < 0) return null;
      i = skipSpaces(open - 1);
    }
    if (text[i] === '"') {
      // A string literal starts the chain.
      let j = i - 1;
      while (j >= 0 && !(text[j] === '"' && text[j - 1] !== "\\")) j--;
      if (j < 0) return null;
      i = j - 1;
      break;
    }
    if (i < 0 || !/[\w$]/.test(text[i])) return null;
    while (i >= 0 && /[\w$]/.test(text[i])) i--;
    const before = skipSpaces(i);
    if (before >= 0 && text[before] === ".") {
      i = skipSpaces(before - 1);
      continue;
    }
    break;
  }
  const expression = text.slice(i + 1, end).trim();
  return expression || null;
}

/** Splits `a.b(x).c[0]` into ["a", "b()", "c", "[]"]: names, calls and indexing. */
function links(expression: string): string[] | null {
  const parts: string[] = [];
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i];
    if (/\s|\./.test(ch)) {
      i++;
    } else if (ch === '"') {
      let j = i + 1;
      while (j < expression.length && !(expression[j] === '"' && expression[j - 1] !== "\\")) j++;
      parts.push('""');
      i = j + 1;
    } else if (ch === "(" || ch === "[") {
      const close = ch === "(" ? ")" : "]";
      let depth = 0;
      let j = i;
      for (; j < expression.length; j++) {
        if (expression[j] === ch) depth++;
        else if (expression[j] === close && --depth === 0) break;
      }
      if (ch === "(" && parts.length) parts[parts.length - 1] += "()";
      else parts.push("[]");
      i = j + 1;
    } else if (/[\w$]/.test(ch)) {
      let j = i;
      while (j < expression.length && /[\w$]/.test(expression[j])) j++;
      parts.push(expression.slice(i, j));
      i = j;
    } else {
      return null;
    }
  }
  return parts;
}

function resolve(expression: string, before: string, known: KnownTypes): Resolved {
  const parts = links(expression);
  if (!parts || parts.length === 0) return null;
  const [first, ...rest] = parts;

  let current: Resolved;
  if (first === '""') current = { type: "String", staticContext: false };
  else if (first === "this") current = enclosingType(before);
  else if (first.endsWith("()")) current = null; // a bare call: its return type would need overload resolution
  else {
    const declared = declaredType(first, before);
    if (declared) current = { type: declared, staticContext: false };
    else if (/^[A-Z]/.test(first) && known.isType(first)) current = { type: first, staticContext: true };
    else current = null;
  }

  for (const part of rest) {
    if (!current) return null;
    if (part === "[]") {
      if (!current.type.endsWith("[]")) return null;
      current = { type: current.type.slice(0, -2), staticContext: false };
      continue;
    }
    const isCall = part.endsWith("()");
    const name = isCall ? part.slice(0, -2) : part;
    const type = known.memberType(current.type, name, isCall, current.staticContext);
    current = type ? { type, staticContext: false } : null;
  }
  if (!current || PRIMITIVES.has(current.type)) return null;
  return current;
}

/**
 * The type `name` was declared with, from the last declaration of it in the
 * text before the cursor: locals, parameters, for-each variables, fields,
 * and `var x = new T(...)` / `var x = "..."`.
 */
export function declaredType(name: string, before: string): string | null {
  const id = name.replace(/\$/g, "\\$");
  const declaration = new RegExp(
    String.raw`\b([A-Za-z_$][\w$]*(?:\s*<[^<>;(){}]*(?:<[^<>;(){}]*>[^<>;(){}]*)*>)?(?:\s*\[\s*\])*)\s+` + id + String.raw`\s*(?=[=;,:)\[])`,
    "g",
  );
  let found: string | null = null;
  for (const match of before.matchAll(declaration)) {
    const type = match[1];
    const word = /^[A-Za-z_$][\w$]*/.exec(type)![0];
    if (["return", "new", "throw", "else", "case", "instanceof", "package", "import"].includes(word)) continue;
    found = type;
  }
  if (found === "var") {
    const init = new RegExp(String.raw`\bvar\s+` + id + String.raw`\s*=\s*(new\s+([A-Za-z_$][\w$]*)|")`, "g");
    let last: RegExpExecArray | null = null;
    for (const m of before.matchAll(init)) last = m;
    if (!last) return null;
    return last[2] ?? "String";
  }
  if (!found) {
    // p instanceof Student s  (pattern variables)
    const pattern = new RegExp(String.raw`\binstanceof\s+([A-Z][\w$]*)\s+` + id + String.raw`\b`, "g");
    for (const m of before.matchAll(pattern)) found = m[1];
  }
  if (!found) return null;
  const arrays = (found.match(/\[\s*\]/g) ?? []).length;
  return found.replace(/<[\s\S]*>/, "").replace(/\[\s*\]/g, "").trim() + "[]".repeat(arrays);
}

/** The class whose body the cursor is in, for `this.` and for private members. */
function enclosingType(before: string): Resolved {
  const name = enclosingClassName(before);
  return name ? { type: name, staticContext: false } : null;
}

function enclosingClassName(before: string): string | null {
  // The last class header whose body is still open at the cursor.
  const headers = [...before.matchAll(/\b(?:class|record|enum|interface)\s+([A-Za-z_$][\w$]*)[^{;]*\{/g)];
  for (let h = headers.length - 1; h >= 0; h--) {
    const start = headers[h].index! + headers[h][0].length;
    let depth = 1;
    for (let i = start; i < before.length && depth > 0; i++) {
      if (before[i] === "{") depth++;
      else if (before[i] === "}") depth--;
    }
    if (depth > 0) return headers[h][1];
  }
  return null;
}

function enclosingClass(before: string, classes: JavaClass[]): string | null {
  const name = enclosingClassName(before);
  return name && classes.some((c) => c.name === name) ? name : null;
}

/** What the reference sheet and the question's classes know about each type. */
class KnownTypes {
  private readonly api: ApiMember[];
  private readonly classes: Map<string, JavaClass>;

  constructor(api: ApiMember[], classes: JavaClass[]) {
    this.api = api;
    this.classes = new Map(classes.map((c) => [c.name, c]));
  }

  isType(name: string): boolean {
    return this.classes.has(name) || this.api.some((m) => m.owner === name);
  }

  /** A class and every class or interface above it that is in the question's files. */
  private lineage(name: string): JavaClass[] {
    const seen = new Set<string>();
    const out: JavaClass[] = [];
    const visit = (n: string) => {
      const c = this.classes.get(n);
      if (!c || seen.has(n)) return;
      seen.add(n);
      out.push(c);
      [...c.extends, ...c.implements].forEach(visit);
    };
    visit(name);
    return out;
  }

  memberType(owner: string, name: string, isCall: boolean, staticContext: boolean): string | null {
    if (owner.endsWith("[]")) return !isCall && name === "length" ? "int" : null;
    for (const c of this.lineage(owner)) {
      const member = c.members.find(
        (m) => m.name === name && (m.kind === "method") === isCall && m.kind !== "constructor" && (!staticContext || m.static),
      );
      if (member) return member.type;
    }
    const fromSheet = this.api.find(
      (m) => m.owner === owner && m.name === name && (m.kind === "method") === isCall && (!staticContext || m.static),
    );
    return fromSheet?.returns ?? null;
  }

  membersOf(type: string, staticContext: boolean, insideClass: string | null): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const seen = new Set<string>();
    const add = (s: Suggestion) => {
      const key = `${s.kind}:${s.label}:${s.detail}`;
      if (seen.has(key)) return;
      seen.add(key);
      suggestions.push(s);
    };

    if (type.endsWith("[]")) {
      add({ label: "length", kind: "field", insertText: "length", snippet: false, detail: "int length", documentation: "The number of elements in the array.", sortText: "0" });
      return suggestions;
    }

    for (const member of this.api) {
      if (member.owner !== type || member.kind === "constructor" || member.static !== staticContext) continue;
      add(fromSheet(member));
    }

    for (const javaClass of this.lineage(type)) {
      for (const member of javaClass.members) {
        if (member.kind === "constructor") continue;
        if (staticContext !== member.static) continue;
        // Private members only from inside their own class.
        if (member.visibility === "private" && insideClass !== javaClass.name) continue;
        add(fromClass(javaClass, member));
      }
    }
    return suggestions;
  }

  constructors(): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const seen = new Set<string>();
    for (const member of this.api) {
      if (member.kind !== "constructor") continue;
      const key = `${member.owner}(${member.params.join(",")})`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({ ...fromSheet(member), label: member.owner });
    }
    for (const javaClass of this.classes.values()) {
      if (javaClass.kind === "interface") continue;
      const ctors = javaClass.members.filter((m) => m.kind === "constructor" && m.visibility !== "private");
      // A class with no constructor of its own has the default one.
      const list = ctors.length ? ctors : [{ name: javaClass.name, kind: "constructor", static: false, visibility: "public", type: javaClass.name, params: [] } as JavaMember];
      for (const ctor of list) {
        const key = `${javaClass.name}(${ctor.params.map((p) => p.type).join(",")})`;
        if (seen.has(key)) continue;
        seen.add(key);
        suggestions.push(fromClass(javaClass, ctor));
      }
    }
    return suggestions;
  }
}

/** ${1:a}, ${2:b} for each parameter. */
const placeholders = (names: string[]) => names.map((name, i) => `\${${i + 1}:${name.replace(/[}$\\]/g, "")}}`).join(", ");

/**
 * "Integer.parseInt(s)", "String.equalsIgnoreCase(t)", "new PrintWriter(name)":
 * by type, since the sheet's own receiver name (s) need not be the student's.
 */
function sheetDetail(member: ApiMember): string {
  if (member.kind === "constructor") return `new ${member.owner}(${member.params.join(", ")})`;
  if (member.kind === "field") return `${member.owner}.${member.name}`;
  return `${member.owner}.${member.name}(${member.params.join(", ")})`;
}

function fromSheet(member: ApiMember): Suggestion {
  if (member.kind === "field") {
    return { label: member.name, kind: "field", insertText: member.name, snippet: false, detail: sheetDetail(member), documentation: member.doc, sortText: `0${member.name}` };
  }
  const params = member.params.filter((p) => p !== "...");
  return {
    label: member.name,
    kind: member.kind,
    insertText: `${member.name}(${placeholders(params)})`,
    snippet: true,
    detail: sheetDetail(member),
    documentation: member.doc,
    sortText: `0${member.name}`,
  };
}

function fromClass(javaClass: JavaClass, member: JavaMember): Suggestion {
  if (member.kind === "field") {
    return { label: member.name, kind: "field", insertText: member.name, snippet: false, detail: `${member.type} ${member.name}`, sortText: `1${member.name}` };
  }
  const signature = member.params.map((p) => `${p.type} ${p.name}`).join(", ");
  const detail = member.kind === "constructor" ? `${javaClass.name}(${signature})` : `${member.type} ${member.name}(${signature})`;
  return {
    label: member.name,
    kind: member.kind,
    insertText: `${member.name}(${placeholders(member.params.map((p) => p.name))})`,
    snippet: true,
    detail,
    sortText: `1${member.name}`,
  };
}
