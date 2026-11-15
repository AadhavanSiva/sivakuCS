// The methods an exam's reference sheet lists, as completion data.
//
// The sheet is Markdown tables whose first column holds code spans:
//   `Integer.parseInt(s)`        a static method of Integer
//   `new PrintWriter(name)`      a constructor
//   `s.trim()`                   an instance method; s's type comes from the
//                                sheet's receivers comment (below)
//   `new File(name).exists()`    a constructor, then an instance method
// and whose second column says what it does (the completion's documentation).
//
// Instance calls name their receiver with a variable, so the sheet says
// what each receiver is, in a comment that is not shown:
//   <!-- receivers: s=String, t=String, reader=BufferedReader, writer=PrintWriter -->

export type ApiMember = {
  /** The class it belongs to: "Integer", "String", "BufferedReader". */
  owner: string;
  kind: "method" | "field" | "constructor";
  static: boolean;
  name: string;
  /** Parameter names as the sheet writes them: ["s"], ["format", "..."]. */
  params: string[];
  /** As written on the sheet: "Integer.parseInt(s)". */
  signature: string;
  /** The sheet's description, as plain text. */
  doc: string;
  /** The type it returns, where known (see RETURNS), so `s.trim().` completes. */
  returns?: string;
};

/** Receivers a sheet may use without declaring them. */
const DEFAULT_RECEIVERS: Record<string, string> = { s: "String", t: "String" };

/** Return types of common library members, for completing chained calls. */
const RETURNS: Record<string, string> = {
  "IO.readln": "String",
  "String.format": "String",
  "String.valueOf": "String",
  "String.trim": "String",
  "String.strip": "String",
  "String.toUpperCase": "String",
  "String.toLowerCase": "String",
  "String.substring": "String",
  "String.replace": "String",
  "String.repeat": "String",
  "String.split": "String[]",
  "String.charAt": "char",
  "String.length": "int",
  "String.indexOf": "int",
  "String.isEmpty": "boolean",
  "String.isBlank": "boolean",
  "String.contains": "boolean",
  "String.equals": "boolean",
  "String.equalsIgnoreCase": "boolean",
  "String.startsWith": "boolean",
  "String.endsWith": "boolean",
  "Integer.parseInt": "int",
  "Integer.toString": "String",
  "Double.parseDouble": "double",
  "Double.toString": "String",
  "BufferedReader.readLine": "String",
  "File.exists": "boolean",
  "File.getName": "String",
};

/** Parameters as written: "a, b" -> ["a", "b"]; nested calls count as one. */
function splitParams(text: string): string[] {
  const params: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(" || ch === "[" || ch === "<") depth++;
    if (ch === ")" || ch === "]" || ch === ">") depth--;
    if (ch === "," && depth === 0) {
      params.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) params.push(current.trim());
  return params;
}

/** The text inside the parentheses that open at `open`, and the index after them. */
function readParens(text: string, open: number): { inner: string; end: number } | null {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    if (text[i] === ")") {
      depth--;
      if (depth === 0) return { inner: text.slice(open + 1, i), end: i + 1 };
    }
  }
  return null;
}

const plain = (markdown: string) =>
  markdown
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .trim();

/** Members one code span describes: `Integer.parseInt(s)`, `new File(name).exists()`... */
function membersOf(code: string, doc: string, receivers: Record<string, string>): ApiMember[] {
  const members: ApiMember[] = [];
  let rest = code.trim();
  let owner: string | null = null;
  let isStatic = false;

  // The start: a constructor, a class (static members), or a receiver.
  const ctor = /^new\s+([A-Z][\w$]*)\s*\(/.exec(rest);
  if (ctor) {
    const parens = readParens(rest, ctor[0].length - 1);
    if (!parens) return members;
    members.push({
      owner: ctor[1],
      kind: "constructor",
      static: false,
      name: ctor[1],
      params: splitParams(parens.inner),
      signature: code,
      doc,
    });
    // A constructor nested in the arguments, as in new BufferedReader(new FileReader(name)).
    for (const inner of membersOf(parens.inner, doc, receivers)) {
      if (inner.kind === "constructor") members.push({ ...inner, signature: code });
    }
    owner = ctor[1];
    rest = rest.slice(parens.end);
  } else {
    const start = /^([A-Za-z_$][\w$]*)/.exec(rest);
    if (!start) return members;
    const name = start[1];
    if (/^[A-Z]/.test(name)) {
      owner = name;
      isStatic = true;
    } else if (receivers[name]) {
      owner = receivers[name];
    } else {
      return members;
    }
    rest = rest.slice(name.length);
  }

  // Then .member(args) or .FIELD, as long as the type is known.
  while (owner && rest.startsWith(".")) {
    const member = /^\.\s*([A-Za-z_$][\w$]*)/.exec(rest);
    if (!member) break;
    const name = member[1];
    rest = rest.slice(member[0].length);
    const key: string = `${owner}.${name}`;
    if (rest.startsWith("(")) {
      const parens = readParens(rest, 0);
      if (!parens) break;
      members.push({ owner, kind: "method", static: isStatic, name, params: splitParams(parens.inner), signature: code, doc, returns: RETURNS[key] });
      rest = rest.slice(parens.end);
    } else {
      members.push({ owner, kind: "field", static: isStatic, name, params: [], signature: code, doc, returns: RETURNS[key] });
    }
    owner = RETURNS[key] ?? null;
    isStatic = false;
  }
  return members;
}

/** Every member a reference sheet lists, in the order it lists them. */
export function parseReferenceSheet(markdown: string): ApiMember[] {
  const receivers = { ...DEFAULT_RECEIVERS };
  const declared = /<!--\s*receivers:([^>]*)-->/i.exec(markdown);
  if (declared) {
    for (const pair of declared[1].split(",")) {
      const [name, type] = pair.split("=").map((part) => part.trim());
      if (name && type) receivers[name] = type;
    }
  }

  const members: ApiMember[] = [];
  const seen = new Set<string>();
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith("|") || /^\|\s*[-:| ]+\|?\s*$/.test(line.trim())) continue;
    const cells = line.split("|").slice(1, -1);
    if (cells.length < 2) continue;
    const doc = plain(cells.slice(1).join("|"));
    for (const span of cells[0].matchAll(/`([^`]+)`/g)) {
      for (const member of membersOf(span[1], doc, receivers)) {
        const key = `${member.owner}.${member.kind}.${member.name}(${member.params.join(",")})`;
        if (seen.has(key)) continue;
        seen.add(key);
        members.push(member);
      }
    }
  }
  return members;
}
