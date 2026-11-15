"use client";

import Editor, { loader } from "@monaco-editor/react";
import { registerJavaCompletions } from "./completions";

// The site serves its own copy of Monaco (scripts/copy-monaco.mjs) rather
// than the CDN the wrapper uses by default.
loader.config({ paths: { vs: "/monaco/vs" } });

const languageOf = (path: string) => (path.endsWith(".java") ? "java" : "plaintext");

export type JavaEditorProps = {
  /** Unique per file and question; Monaco keeps one model, and its undo history, per path. */
  path: string;
  /** The text a model starts with; later changes come from typing. */
  initialText: string;
  readOnly: boolean;
  onChange: (text: string) => void;
  /** Ctrl+S / Cmd+S: changes save themselves; this only confirms it. */
  onSave?: () => void;
};

export function JavaEditor({ path, initialText, readOnly, onChange, onSave }: JavaEditorProps) {
  return (
    <Editor
      height="100%"
      theme="vs-dark"
      path={path}
      defaultLanguage={languageOf(path)}
      defaultValue={initialText}
      keepCurrentModel
      beforeMount={registerJavaCompletions}
      onChange={(text) => onChange(text ?? "")}
      onMount={(editor, monaco) => {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSave?.());
        // For the browser tests, which set file contents through Monaco's models.
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { sivakuMonaco: typeof monaco }).sivakuMonaco = monaco;
        }
      }}
      loading={<p className="p-3 text-sm text-neutral-400">Loading the editor…</p>}
      options={{
        readOnly,
        domReadOnly: readOnly,
        readOnlyMessage: { value: "This file is read-only." },
        fontSize: 14,
        tabSize: 4,
        insertSpaces: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        fixedOverflowWidgets: true,
      }}
    />
  );
}
