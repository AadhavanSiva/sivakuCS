"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type AttemptState, type Checkpoint, loadAttempt, saveAttempt } from "@/lib/attempt-storage";
import type { Exam } from "@/lib/content/types";
import { InstructionsSlide } from "./InstructionsSlide";
import { QuestionSlide, type SaveStatus } from "./QuestionSlide";
import { SlideRail } from "./SlideRail";
import { TopBar } from "./TopBar";

const SAVE_DELAY_MS = 400;

/** The slide named in the address (#2), if it is a real one. */
function slideFromHash(slides: number): number | null {
  const n = Number(window.location.hash.slice(1));
  return window.location.hash.length > 1 && Number.isInteger(n) && n >= 0 && n < slides ? n : null;
}

/**
 * An exam attempt, laid out like a coding challenge: slide rail, question
 * and reference sheet on the left, files and editor on the right, Run
 * console and Test panel below. Everything the student does is kept in
 * this browser (lib/attempt-storage.ts), so a refresh resumes where they were.
 */
export function Workspace({ exam }: { exam: Exam }) {
  const slides = exam.questions.length + 1;
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef<AttemptState | null>(null);

  // localStorage exists only in the browser, so the attempt is read after the first render.
  useEffect(() => {
    const saved = loadAttempt(exam.id);
    const slide = slideFromHash(slides) ?? Math.min(saved.slide, slides - 1);
    const restored = { ...saved, slide };
    latest.current = restored;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    setAttempt(restored);
  }, [exam.id, slides]);

  const saveNow = useCallback(() => {
    clearTimeout(saveTimer.current);
    if (latest.current) setSaveStatus(saveAttempt(exam.id, latest.current) ? "saved" : "failed");
  }, [exam.id]);

  const update = useCallback(
    (change: (state: AttemptState) => AttemptState, delay = 0) => {
      // Computed here rather than in a setState updater, which React runs
      // later: the save below must see this change.
      if (!latest.current) return;
      const next = change(latest.current);
      latest.current = next;
      setAttempt(next);
      clearTimeout(saveTimer.current);
      if (delay === 0) {
        saveNow();
      } else {
        setSaveStatus("saving");
        saveTimer.current = setTimeout(saveNow, delay);
      }
    },
    [saveNow],
  );

  // Leaving or refreshing mid-edit: save what is pending.
  useEffect(() => {
    window.addEventListener("pagehide", saveNow);
    return () => {
      window.removeEventListener("pagehide", saveNow);
      saveNow();
    };
  }, [saveNow]);

  const select = useCallback(
    (slide: number) => {
      if (slide < 0 || slide >= slides) return;
      window.history.replaceState(null, "", `#${slide}`);
      update((state) => ({ ...state, slide }));
    },
    [slides, update],
  );

  if (!attempt) {
    return <div className="flex-1 bg-[#1e1e1e]" aria-busy="true" />;
  }

  const { slide } = attempt;
  const question = slide > 0 ? exam.questions[slide - 1] : null;
  const title = question ? `${slide}. ${question.meta.title}` : "Exam instructions";

  return (
    <div data-testid="workspace" data-theme="exam" className="flex min-h-0 flex-1 flex-col bg-[#1e1e1e] text-neutral-200">
      <TopBar title={title} slide={slide} slides={slides} onSelect={select} />
      <div className="flex min-h-0 flex-1">
        <SlideRail questions={exam.questions} checkpoints={attempt.checkpoints} slide={slide} onSelect={select} />
        {question ? (
          <QuestionSlide
            key={question.id}
            question={question}
            number={slide}
            referenceHtml={exam.referenceHtml ?? ""}
            studentFiles={attempt.files[question.id] ?? {}}
            checkpoint={attempt.checkpoints[question.id]}
            saveStatus={saveStatus}
            onEdit={(name, text) =>
              update(
                (state) => ({
                  ...state,
                  files: { ...state.files, [question.id]: { ...state.files[question.id], [name]: text } },
                }),
                SAVE_DELAY_MS,
              )
            }
            onSaveNow={saveNow}
            onTested={(checkpoint: Checkpoint) =>
              update((state) => ({ ...state, checkpoints: { ...state.checkpoints, [question.id]: checkpoint } }))
            }
          />
        ) : (
          <InstructionsSlide exam={exam} onStart={() => select(1)} />
        )}
      </div>
    </div>
  );
}
