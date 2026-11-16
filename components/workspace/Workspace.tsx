"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { attemptInput, checkpointInput, submissionInput } from "@/lib/account-payload";
import { recordSubmissionAction, saveCheckpointAction, startAttemptAction } from "@/lib/actions/attempts";
import {
  type AttemptState,
  type Checkpoint,
  clearAttempt,
  loadAttempt,
  newAttempt,
  saveAttempt,
} from "@/lib/attempt-storage";
import type { Exam } from "@/lib/content/types";
import { gradeExam } from "@/lib/grading/submit";
import { getJava } from "@/lib/java-runtime";
import { Countdown } from "./Countdown";
import { DIALOG_DANGER, DIALOG_PRIMARY, DIALOG_SECONDARY, Dialog } from "./Dialog";
import { InstructionsSlide } from "./InstructionsSlide";
import { type CheckpointSync, QuestionSlide, type SaveStatus } from "./QuestionSlide";
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
 * and feedback on the left, files and editor on the right, the console
 * below. It starts by asking whether to time the attempt; a timed one
 * counts down in the top bar and is submitted when time runs out. After
 * Submit, the submitted code stays here, read-only, and the results have
 * their own page. Everything is kept in this browser
 * (lib/attempt-storage.ts), so a refresh resumes where the student was,
 * with the same time left. Test and Submit also save to the student's
 * account (My attempts); the code in progress stays in the browser.
 */
export function Workspace({ exam, userId }: { exam: Exam; userId: string }) {
  const router = useRouter();
  const slides = exam.questions.length + 1;
  const which = useMemo(() => ({ userId, examId: exam.id }), [userId, exam.id]);
  /** Per question, whether the last Test reached the account. */
  const [checkpointSync, setCheckpointSync] = useState<Record<string, CheckpointSync>>({});
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [timeUp, setTimeUp] = useState(false);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [confirmingRestart, setConfirmingRestart] = useState(false);
  /** The question being graded while submitting, or null when not submitting. */
  const [gradingQuestion, setGradingQuestion] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef<AttemptState | null>(null);
  const submitInProgress = useRef(false);

  // localStorage exists only in the browser, so the attempt is read after the first render.
  useEffect(() => {
    const saved = loadAttempt(which);
    const slide = slideFromHash(slides) ?? Math.min(saved.slide, slides - 1);
    const restored = { ...saved, slide };
    latest.current = restored;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    setAttempt(restored);
  }, [which, slides]);

  const saveNow = useCallback(() => {
    clearTimeout(saveTimer.current);
    if (latest.current) setSaveStatus(saveAttempt(which, latest.current) ? "saved" : "failed");
  }, [which]);

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

  /** Grades every question as it stands and records the submission. */
  const submit = useCallback(
    async (automatic: boolean) => {
      const current = latest.current;
      if (!current || current.submission || submitInProgress.current) return;
      submitInProgress.current = true;
      setConfirmingSubmit(false);
      setSubmitError(null);
      // Recorded first, so a refresh while grading resumes the submission.
      update((state) => ({ ...state, submitting: state.submitting ?? { at: Date.now(), automatic } }));
      const java = getJava();
      // A Run or Test still going ends here; the code is final.
      java.stop();
      setGradingQuestion(1);
      try {
        const graded = await gradeExam(java, exam, latest.current!.files, setGradingQuestion);
        const submission = { at: Date.now(), automatic: latest.current!.submitting?.automatic ?? automatic, ...graded };
        // Kept in the browser first, so nothing is lost if the account cannot be reached.
        update((state) => ({ ...state, submitting: undefined, submission: { ...submission, saved: false } }));
        // Then to the account; if that fails, the results page offers to try again.
        const attemptInfo = attemptInput(exam.id, latest.current!);
        if (attemptInfo) {
          const saved = await recordSubmissionAction(submissionInput(attemptInfo, submission)).catch(() => null);
          if (saved?.ok) update((state) => ({ ...state, submission: state.submission && { ...state.submission, saved: true } }));
        }
        router.push(`/exams/${exam.id}/results`);
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : String(error));
      } finally {
        submitInProgress.current = false;
        setGradingQuestion(null);
      }
    },
    [exam, router, update],
  );

  // A submission that a refresh interrupted carries on.
  const resumed = useRef(false);
  useEffect(() => {
    if (!attempt || resumed.current) return;
    resumed.current = true;
    if (!attempt.submitting || attempt.submission) return;
    const automatic = attempt.submitting.automatic;
    const timer = setTimeout(() => void submit(automatic), 0);
    return () => clearTimeout(timer);
  }, [attempt, submit]);

  const onTimeUp = useCallback(() => {
    setTimeUp(true);
    void submit(true);
  }, [submit]);

  function chooseTimer(timed: boolean) {
    const now = Date.now();
    update((state) => ({
      ...state,
      timer: { timed, startedAt: now, deadline: timed ? now + exam.meta.minutes * 60_000 : undefined },
    }));
    // The attempt appears in My attempts. If this fails, Test or Submit adds it.
    const info = attemptInput(exam.id, latest.current!);
    if (info) void startAttemptAction(info).catch(() => {});
  }

  /** Test was pressed: keep the checkpoint here, then save it to the account. */
  function tested(questionId: string, checkpoint: Checkpoint) {
    update((state) => ({ ...state, checkpoints: { ...state.checkpoints, [questionId]: checkpoint } }));
    const info = attemptInput(exam.id, latest.current!);
    if (!info) return;
    setCheckpointSync((s) => ({ ...s, [questionId]: "saving" }));
    saveCheckpointAction(checkpointInput(info, questionId, checkpoint))
      .catch(() => null)
      .then((result) => {
        // A later Test of the same question may have overtaken this one.
        if (latest.current?.checkpoints[questionId] !== checkpoint) return;
        setCheckpointSync((s) => ({ ...s, [questionId]: result?.ok ? "saved" : "failed" }));
      });
  }

  function startNewAttempt() {
    clearAttempt(which);
    const fresh = newAttempt();
    latest.current = fresh;
    setAttempt(fresh);
    setTimeUp(false);
    setConfirmingRestart(false);
    setSubmitError(null);
    setCheckpointSync({});
    window.history.replaceState(null, "", "#0");
    saveNow();
  }

  if (!attempt) {
    return <div className="flex-1 bg-[#1e1e1e]" aria-busy="true" />;
  }

  const { slide, timer, submission, submitting } = attempt;
  const question = slide > 0 ? exam.questions[slide - 1] : null;
  const title = question ? `Q${slide}: ${question.meta.title}` : "Exam instructions";
  const submitted = Boolean(submission);
  // Code is locked once submitted, while submitting, and when time is up.
  const locked = submitted || Boolean(submitting) || gradingQuestion !== null || timeUp;
  const lockReason = submitted
    ? "Submitted: read-only"
    : timeUp
      ? "Time is up: read-only"
      : locked
        ? "Submitting: read-only"
        : undefined;
  const filesOf = (id: string) => (submission ? submission.files[id] : attempt.files[id]) ?? {};

  const topRight = submitted ? (
    <>
      <span data-testid="submitted-badge" className="text-[13px] text-neutral-400">
        Submitted
      </span>
      <Link href={`/exams/${exam.id}/results`} data-testid="view-results" className="rounded border border-[#4a4a4a] px-3 py-1 text-neutral-200 hover:bg-[#383838]">
        Results
      </Link>
    </>
  ) : (
    <>
      {timer?.timed && timer.deadline !== undefined && <Countdown deadline={timer.deadline} onExpire={onTimeUp} />}
      <button
        type="button"
        data-testid="submit"
        className="rounded bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!timer || locked}
        onClick={() => setConfirmingSubmit(true)}
      >
        Submit
      </button>
    </>
  );

  return (
    <div data-testid="workspace" data-theme="exam" className="flex min-h-0 flex-1 flex-col bg-[#1e1e1e] text-neutral-200">
      <TopBar title={title} slide={slide} slides={slides} onSelect={select}>
        {topRight}
      </TopBar>
      <div className="flex min-h-0 flex-1">
        <SlideRail questions={exam.questions} checkpoints={attempt.checkpoints} slide={slide} onSelect={select} />
        {question ? (
          <QuestionSlide
            key={question.id}
            attemptId={attempt.id}
            question={question}
            number={slide}
            referenceHtml={exam.referenceHtml ?? ""}
            referenceApi={exam.referenceApi ?? []}
            studentFiles={filesOf(question.id)}
            checkpoint={attempt.checkpoints[question.id]}
            submitted={
              submission?.results[question.id] ? { result: submission.results[question.id], at: submission.at } : undefined
            }
            checkpointSync={checkpointSync[question.id]}
            saveStatus={saveStatus}
            lockReason={lockReason}
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
            onTested={(checkpoint: Checkpoint) => tested(question.id, checkpoint)}
          />
        ) : (
          <InstructionsSlide
            exam={exam}
            timer={timer}
            submitted={submitted}
            onStart={() => select(1)}
            onNewAttempt={() => setConfirmingRestart(true)}
          />
        )}
      </div>

      {!timer && !submitted && (
        <Dialog
          title={`Do you want a ${exam.meta.minutes}-minute timer?`}
          testid="timer-prompt"
          actions={
            <>
              <button type="button" data-testid="timer-yes" className={DIALOG_PRIMARY} onClick={() => chooseTimer(true)}>
                Yes, time me
              </button>
              <button type="button" data-testid="timer-no" className={DIALOG_SECONDARY} onClick={() => chooseTimer(false)}>
                No timer
              </button>
            </>
          }
        >
          <p>
            <strong>Timed:</strong> a {exam.meta.minutes}-minute countdown runs in the top bar from now, as on the real
            exam. When it reaches zero, your code is locked and submitted for you. Leaving or refreshing the page does not
            stop the clock.
          </p>
          <p>
            <strong>No timer:</strong> work at your own pace and submit when you are ready.
          </p>
        </Dialog>
      )}

      {confirmingSubmit && (
        <Dialog
          title="Submit your exam?"
          testid="submit-confirm"
          onDismiss={() => setConfirmingSubmit(false)}
          actions={
            <>
              <button type="button" data-testid="submit-cancel" className={DIALOG_SECONDARY} onClick={() => setConfirmingSubmit(false)}>
                Keep working
              </button>
              <button type="button" data-testid="submit-confirm-yes" className={DIALOG_PRIMARY} onClick={() => void submit(false)}>
                Submit
              </button>
            </>
          }
        >
          <p>
            This ends the attempt. Every question is graded as your code stands now, and you will not be able to change
            it afterwards.
          </p>
        </Dialog>
      )}

      {(gradingQuestion !== null || submitError) && (
        <Dialog
          title={timeUp || submitting?.automatic ? "Time is up" : "Submitting"}
          testid="submitting"
          actions={
            submitError ? (
              <button type="button" className={DIALOG_PRIMARY} onClick={() => void submit(submitting?.automatic ?? timeUp)}>
                Try again
              </button>
            ) : null
          }
        >
          {submitError ? (
            <p className="text-rose-400">Your exam could not be graded: {submitError}</p>
          ) : (
            <p data-testid="submitting-progress">
              {timeUp || submitting?.automatic ? "Your code is locked and being submitted. " : ""}
              Grading question {gradingQuestion} of {exam.questions.length}…
            </p>
          )}
        </Dialog>
      )}

      {confirmingRestart && (
        <Dialog
          title="Start a new attempt?"
          testid="restart-confirm"
          onDismiss={() => setConfirmingRestart(false)}
          actions={
            <>
              <button type="button" className={DIALOG_SECONDARY} onClick={() => setConfirmingRestart(false)}>
                Cancel
              </button>
              <button type="button" data-testid="restart-confirm-yes" className={DIALOG_DANGER} onClick={startNewAttempt}>
                Start again
              </button>
            </>
          }
        >
          <p>
            You start this exam again from the beginning, with empty files. Your last attempt stays in My attempts.
          </p>
        </Dialog>
      )}
    </div>
  );
}
