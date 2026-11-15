"use client";

type Props = {
  title: string;
  open: boolean;
  onToggle: () => void;
  testid: string;
  /** Shown at the right of the heading, such as a question's points. */
  aside?: React.ReactNode;
  children: React.ReactNode;
  ref?: React.Ref<HTMLElement>;
};

/** A section with a heading that opens and closes it, as in the workspace's left pane. */
export function Collapsible({ title, open, onToggle, testid, aside, children, ref }: Props) {
  return (
    <section ref={ref} data-testid={testid} className="border-b border-[#3c3c3c]">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex w-full items-center gap-2 px-5 py-2.5 text-left text-sm font-semibold text-neutral-200 hover:bg-white/5"
        >
          <span aria-hidden="true" className="w-3 text-neutral-500">
            {open ? "▾" : "▸"}
          </span>
          <span className="min-w-0 flex-1 truncate">{title}</span>
          {aside}
        </button>
      </h2>
      {open && <div className="px-5 pb-5">{children}</div>}
    </section>
  );
}
