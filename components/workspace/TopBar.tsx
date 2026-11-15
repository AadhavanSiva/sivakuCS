"use client";

import Link from "next/link";

type Props = {
  title: string;
  slide: number;
  slides: number;
  onSelect: (slide: number) => void;
};

/**
 * Back to the exam list, Prev / Next, the slide's title, and (from the
 * timer and results work) the countdown and Submit.
 */
export function TopBar({ title, slide, slides, onSelect }: Props) {
  return (
    <header className="grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[#3c3c3c] bg-[#252526] px-3 text-sm">
      <div className="flex items-center gap-2">
        <Link href="/exams" className="rounded px-2 py-1 text-neutral-300 hover:bg-[#383838]" data-testid="back-to-exams">
          ← Exams
        </Link>
        <button
          type="button"
          data-testid="prev"
          className="rounded px-2 py-1 text-neutral-300 hover:bg-[#383838] disabled:opacity-30"
          disabled={slide === 0}
          onClick={() => onSelect(slide - 1)}
        >
          ‹ Prev
        </button>
        <button
          type="button"
          data-testid="next"
          className="rounded px-2 py-1 text-neutral-300 hover:bg-[#383838] disabled:opacity-30"
          disabled={slide === slides - 1}
          onClick={() => onSelect(slide + 1)}
        >
          Next ›
        </button>
      </div>
      <h1 data-testid="slide-title" className="truncate text-center font-medium text-neutral-100">
        {title}
      </h1>
      <div className="flex items-center justify-end gap-3">
        {/* The countdown and Submit arrive with the timer and results page. */}
        <button
          type="button"
          data-testid="submit"
          className="rounded border border-[#4a4a4a] px-3 py-1 text-neutral-400"
          disabled
          title="Submitting comes with the results page"
        >
          Submit
        </button>
      </div>
    </header>
  );
}
