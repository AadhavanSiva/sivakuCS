"use client";

import { useEffect, useRef } from "react";

type Props = {
  title: string;
  testid: string;
  children: React.ReactNode;
  /** The buttons. The first is focused when the dialog opens. */
  actions: React.ReactNode;
  /** Escape and a click outside call this; leave it out for a question that must be answered. */
  onDismiss?: () => void;
};

/** A modal question over the workspace, which cannot be used until it is answered. */
export function Dialog({ title, testid, children, actions, onDismiss }: Props) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onDismiss) onDismiss();
      // Keep Tab inside the dialog.
      if (e.key === "Tab" && panel.current) {
        const buttons = [...panel.current.querySelectorAll<HTMLElement>("button, a[href]")];
        if (buttons.length === 0) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss?.();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${testid}-title`}
        data-testid={testid}
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-[#3c3c3c] bg-[#252526] p-6 text-neutral-200 shadow-2xl"
      >
        <h2 id={`${testid}-title`} className="text-lg font-semibold text-neutral-100">
          {title}
        </h2>
        <div className="flex flex-col gap-2 text-sm leading-relaxed text-neutral-300">{children}</div>
        <div className="flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}

export const DIALOG_PRIMARY = "rounded bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500";
export const DIALOG_SECONDARY = "rounded border border-[#4a4a4a] px-4 py-1.5 text-sm text-neutral-200 hover:bg-[#2d2d2d]";
export const DIALOG_DANGER = "rounded bg-rose-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-500";
