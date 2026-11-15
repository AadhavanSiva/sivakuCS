"use client";

import { loader, type Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { registerJavaCompletions } from "./completions";

// The site serves its own copy of Monaco (scripts/copy-monaco.mjs) rather
// than the CDN the loader uses by default.
loader.config({ paths: { vs: "/monaco/vs" } });

const languageOf = (path: string) => (path.endsWith(".java") ? "java" : "plaintext");

/** Scroll position and cursor per file, kept while the student moves between files. */
const viewStates = new Map<string, editor.ICodeEditorViewState | null>();

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

/**
 * The Monaco editor for one file.
 *
 * The editor is created in an effect and disposed in its clean-up, so it is
 * created afresh whenever the effect runs again. Next.js keeps recently
 * visited pages alive and runs their effects' clean-ups when the student
 * leaves; a wrapper that kept its disposed editor across that (as
 * @monaco-editor/react does) failed when the student came back. Models,
 * and so the text and undo history, live on in Monaco by path.
 */
export function JavaEditor({ path, initialText, readOnly, onChange, onSave }: JavaEditorProps) {
  const container = useRef<HTMLDivElement>(null);
  const current = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [monaco, setMonaco] = useState<Monaco | null>(null);
  // The latest callbacks and text, read by the editor's listeners without re-creating it.
  const latest = useRef({ onChange, onSave, initialText, readOnly });
  useEffect(() => {
    latest.current = { onChange, onSave, initialText, readOnly };
  });

  useEffect(() => {
    let cancelled = false;
    loader
      .init()
      .then((instance) => {
        if (cancelled) return;
        registerJavaCompletions(instance);
        setMonaco(instance);
      })
      .catch((error) => {
        if (error?.type !== "cancelation") console.error("The editor could not load:", error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!monaco || !container.current) return;
    const uri = monaco.Uri.parse(`file:///${path}`);
    const model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(latest.current.initialText, languageOf(path), uri);
    const instance = monaco.editor.create(container.current, {
      model,
      theme: "vs-dark",
      readOnly: latest.current.readOnly,
      domReadOnly: latest.current.readOnly,
      readOnlyMessage: { value: "This file is read-only." },
      fontSize: 14,
      tabSize: 4,
      insertSpaces: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      fixedOverflowWidgets: true,
    });
    const state = viewStates.get(path);
    if (state) instance.restoreViewState(state);
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => latest.current.onSave?.());
    const changes = instance.onDidChangeModelContent(() => latest.current.onChange(instance.getValue()));
    current.current = instance;
    // For the browser tests, which set file contents through Monaco's models.
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { sivakuMonaco: Monaco }).sivakuMonaco = monaco;
    }
    return () => {
      viewStates.set(path, instance.saveViewState());
      changes.dispose();
      instance.dispose();
      current.current = null;
    };
  }, [monaco, path]);

  useEffect(() => {
    current.current?.updateOptions({ readOnly, domReadOnly: readOnly });
  }, [readOnly]);

  return (
    <div className="relative h-full w-full">
      {!monaco && <p className="absolute p-3 text-sm text-neutral-400">Loading the editor…</p>}
      <div ref={container} data-testid="editor" className="h-full w-full" />
    </div>
  );
}
