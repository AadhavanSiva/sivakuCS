"use client";

import { useEffect, useRef, useState } from "react";

/** A component of the student's panel, as sivaku.swing.SwingHost describes it. */
export type SwingNode = {
  id: number;
  kind: "panel" | "button" | "label" | "field" | "component" | "other";
  text?: string;
  enabled?: boolean;
  editable?: boolean;
  visible?: boolean;
  columns?: number;
  align?: "left" | "center" | "right";
  children?: SwingNode[];
};

type Props = {
  root: SwingNode;
  /** Sends one event line to the running panel: "click 3", "enter 2", "text 2 hello". */
  send: (event: string) => void;
  close: () => void;
};

/**
 * Run for a Swing question: the student's panel drawn as plain HTML, in
 * place of the window Ed would open. Buttons click, text fields type, and
 * labels show what the listeners set; every change goes to the panel in
 * the JVM, which sends back the new state.
 */
export function SwingPanelView({ root, send, close }: Props) {
  return (
    <div
      data-testid="swing-panel"
      className="mb-2 rounded border border-neutral-500/40 bg-[#eeeeee] p-3 font-sans text-[13px] text-neutral-900"
      // Clicks here are for the panel, not the terminal's input line.
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between border-b border-neutral-400/50 pb-1 text-[11px] text-neutral-600">
        <span>Your panel, as it would appear in a window</span>
        <button type="button" data-testid="swing-close" className="rounded px-1.5 hover:bg-neutral-300" onClick={close}>
          Close
        </button>
      </div>
      <Node node={root} send={send} />
    </div>
  );
}

function Node({ node, send }: { node: SwingNode; send: Props["send"] }) {
  if (node.visible === false) return null;
  switch (node.kind) {
    case "panel":
      return (
        <div data-testid="swing-container" className="flex flex-wrap items-center gap-2">
          {(node.children ?? []).map((child) => (
            <Node key={child.id} node={child} send={send} />
          ))}
        </div>
      );
    case "button":
      return (
        <button
          type="button"
          data-testid="swing-button"
          data-id={node.id}
          disabled={!node.enabled}
          onClick={() => send(`click ${node.id}`)}
          className="rounded border border-neutral-500 bg-gradient-to-b from-white to-neutral-200 px-3 py-0.5 hover:from-neutral-50 disabled:text-neutral-400"
        >
          {node.text || " "}
        </button>
      );
    case "label":
      return (
        <span data-testid="swing-label" data-id={node.id} className="min-w-[2ch] whitespace-pre" style={{ textAlign: node.align }}>
          {node.text ?? ""}
        </span>
      );
    case "field":
      return <Field node={node} send={send} />;
    default:
      return null;
  }
}

function Field({ node, send }: { node: SwingNode; send: Props["send"] }) {
  // What the student is typing stays put while the field has focus; the
  // panel's own setText calls show up otherwise.
  const [value, setValue] = useState(node.text ?? "");
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setValue(node.text ?? "");
  }, [node.text]);
  return (
    <input
      data-testid="swing-field"
      data-id={node.id}
      value={value}
      disabled={!node.enabled}
      readOnly={node.editable === false}
      size={Math.max(node.columns || 8, 2)}
      onFocus={() => (focused.current = true)}
      onBlur={() => (focused.current = false)}
      onChange={(e) => {
        setValue(e.target.value);
        send(`text ${node.id} ${e.target.value.replace(/[\r\n]/g, " ")}`);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") send(`enter ${node.id}`);
      }}
      className="rounded border border-neutral-500 bg-white px-1 py-0.5 text-neutral-900 disabled:bg-neutral-100"
    />
  );
}
