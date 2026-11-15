"use client";

// Connects the autocomplete engine (lib/autocomplete) to Monaco. One
// provider for every Java editor; the question on screen tells it what its
// files and the exam's reference sheet are.
import type { Monaco } from "@monaco-editor/react";
import type { Position, editor } from "monaco-editor";
import { type CompletionContext, completeAt } from "@/lib/autocomplete/complete";

let currentContext: () => CompletionContext = () => ({ api: [], files: {} });

/** The question on screen: the exam's reference sheet and its files as they stand. */
export function setCompletionContext(context: () => CompletionContext): void {
  currentContext = context;
}

const registered = new WeakSet<object>();

/** Registers the Java completion provider with this Monaco, once. */
export function registerJavaCompletions(monaco: Monaco): void {
  if (registered.has(monaco)) return;
  registered.add(monaco);

  const kinds = {
    method: monaco.languages.CompletionItemKind.Method,
    field: monaco.languages.CompletionItemKind.Field,
    constructor: monaco.languages.CompletionItemKind.Constructor,
  };

  monaco.languages.registerCompletionItemProvider("java", {
    triggerCharacters: ["."],
    provideCompletionItems(model: editor.ITextModel, position: Position) {
      const textBefore = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const context = currentContext();
      // This file as it is in the editor now, which may be ahead of the saved copy.
      const name = model.uri.path.split("/").pop() ?? "";
      const files = { ...context.files, [name]: model.getValue() };
      const suggestions = completeAt(textBefore, { api: context.api, files });
      if (!suggestions) return { suggestions: [] };

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      return {
        suggestions: suggestions.map((s) => ({
          label: s.label,
          kind: kinds[s.kind],
          insertText: s.insertText,
          insertTextRules: s.snippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
          detail: s.detail,
          documentation: s.documentation,
          sortText: s.sortText,
          range,
        })),
      };
    },
  });
}
