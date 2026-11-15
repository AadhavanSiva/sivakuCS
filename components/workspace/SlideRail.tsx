"use client";

import type { Checkpoint } from "@/lib/attempt-storage";
import type { Question } from "@/lib/grading/types";

type Props = {
  questions: Question[];
  checkpoints: Record<string, Checkpoint>;
  slide: number;
  onSelect: (slide: number) => void;
};

/**
 * The narrow rail down the left: the instructions, then one button per
 * question with a mark once it has been tested (✓ when every test passed).
 */
export function SlideRail({ questions, checkpoints, slide, onSelect }: Props) {
  return (
    <nav aria-label="Slides" className="flex w-12 shrink-0 flex-col items-center gap-1.5 overflow-y-auto border-r border-[#3c3c3c] bg-[#252526] py-2">
      <RailButton active={slide === 0} label="Exam instructions" testid="rail-0" onClick={() => onSelect(0)}>
        <PageIcon />
      </RailButton>
      {questions.map((question, i) => {
        const checkpoint = checkpoints[question.id];
        const done = checkpoint && checkpoint.result.passed === checkpoint.result.total;
        const state = done ? "done" : checkpoint ? "tested" : "untested";
        return (
          <RailButton
            key={question.id}
            active={slide === i + 1}
            label={`Q${i + 1}: ${question.meta.title}${done ? ", all tests passed" : checkpoint ? ", tested" : ""}`}
            testid={`rail-${i + 1}`}
            state={state}
            onClick={() => onSelect(i + 1)}
          >
            <CodeIcon />
            {done && (
              <span aria-hidden="true" className="absolute -right-1 -top-1 rounded-full bg-emerald-600 px-1 text-[9px] leading-4 text-white">
                ✓
              </span>
            )}
            {!done && checkpoint && (
              <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-500" />
            )}
          </RailButton>
        );
      })}
    </nav>
  );
}

/** A page: the exam instructions. */
function PageIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M4 1.5h5.5L13 5v9.5H4z" strokeLinejoin="round" />
      <path d="M9.5 1.5V5H13" strokeLinejoin="round" />
      <path d="M6 8h5M6 10.5h5" strokeLinecap="round" />
    </svg>
  );
}

/** <>: a coding question. */
function CodeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5.5 4 1.5 8l4 4M10.5 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RailButton({
  active,
  label,
  testid,
  state,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  testid: string;
  state?: "done" | "tested" | "untested";
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? "step" : undefined}
      title={label}
      data-testid={testid}
      data-state={state}
      onClick={onClick}
      className={`relative flex size-8 items-center justify-center rounded text-sm ${
        active ? "bg-emerald-700 text-white" : "bg-[#2d2d2d] text-neutral-300 hover:bg-[#383838]"
      }`}
    >
      {children}
    </button>
  );
}
