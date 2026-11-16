"use client";

import { useEffect, useRef, useState } from "react";
import { Collapsible } from "@/components/Collapsible";
import { StartingJava } from "@/components/StartingJava";
import { Testcases } from "@/components/Testcases";
import type { ApiMember } from "@/lib/autocomplete/reference-api";
import type { Checkpoint } from "@/lib/attempt-storage";
import { filesToCompile, gradeQuestion } from "@/lib/grading/grade";
import type { Question } from "@/lib/grading/types";
import { getJava, preloadJava, useJavaRuntime } from "@/lib/java-runtime";
import type { JavaFiles } from "@/lib/java/programs";
import { JavaEditor } from "./JavaEditor";
import { setCompletionContext } from "./completions";
import { RunConsole, type RunConsoleHandle } from "./RunConsole";

export type SaveStatus = "saved" | "saving" | "failed";
export type CheckpointSync = "saving" | "saved" | "failed";

type Props = {
  /** Keys the editor's buffers, so a new attempt starts from fresh ones. */
  attemptId: string;
  question: Question;
  number: number;
  referenceHtml: string;
  /** The reference sheet's methods, for autocomplete. */
  referenceApi: ApiMember[];
  /** The student's editable files; missing ones are taken from the starter. */
  studentFiles: JavaFiles;
  checkpoint: Checkpoint | undefined;
  /** Whether the last Test's checkpoint reached the account (this visit only). */
  checkpointSync?: CheckpointSync;
  saveStatus: SaveStatus;
  /** Set when the code cannot be changed (time is up, or submitted): every file is read-only and Run and Test are off. */
  lockReason?: string;
  onEdit: (name: string, text: string) => void;
  onSaveNow: () => void;
  onTested: (checkpoint: Checkpoint) => void;
};

/**
 * One question. Left: Description (the question and the reference sheet)
 * and Feedback (the test results). Right: file tabs, the editor, a status
 * bar, and the console with Run and Test.
 */
export function QuestionSlide(props: Props) {
  const { attemptId, question, number, referenceHtml, referenceApi, studentFiles, checkpoint, checkpointSync, saveStatus, lockReason, onEdit, onSaveNow, onTested } = props;
  const locked = lockReason !== undefined;
  const { meta } = question;
  const tabs = [...meta.editable, ...meta.readOnly];
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [descriptionOpen, setDescriptionOpen] = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(true);
  const [running, setRunning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const runConsole = useRef<RunConsoleHandle>(null);
  const feedback = useRef<HTMLElement>(null);
  const { status } = useJavaRuntime();

  // Reached directly (a refresh mid-attempt): Java may not have started yet.
  useEffect(preloadJava, []);

  const editable = new Set(meta.editable);
  const textOf = (name: string) =>
    editable.has(name) ? (studentFiles[name] ?? question.starter[name] ?? "") : (question.given[name] ?? "");
  const mainClass = meta.mainClass ?? "Main";
  const compileSet = filesToCompile(question, studentFiles);
  const canRun = `${mainClass}.java` in compileSet;
  // Data files (laps.txt...) the program can open when it is Run.
  const dataFiles = Object.fromEntries(Object.entries(compileSet).filter(([name]) => !name.endsWith(".java")));
  const javaBroken = status === "failed";

  // Autocomplete offers the reference sheet's methods and this question's classes.
  useEffect(() => {
    setCompletionContext(() => ({ api: referenceApi, files: compileSet }));
  });

  async function test() {
    setFeedbackOpen(true);
    setTesting(true);
    setTestError(null);
    // Bring the results into view; the description may be long.
    requestAnimationFrame(() => feedback.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    try {
      const files = Object.fromEntries(meta.editable.map((name) => [name, textOf(name)]));
      const result = await gradeQuestion(getJava(), question, files);
      onTested({ files, result, at: Date.now() });
    } catch (error) {
      setTestError(error instanceof Error ? error.message : String(error));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="w-[40%] min-w-[18rem] overflow-y-auto border-r border-[#3c3c3c] bg-[#1f1f1f]">
        <Collapsible title="Description" open={descriptionOpen} onToggle={() => setDescriptionOpen(!descriptionOpen)} testid="section-description">
          <article
            data-testid="question-description"
            className="content-html"
            dangerouslySetInnerHTML={{ __html: question.descriptionHtml ?? "" }}
          />
          <h2 className="mb-2 mt-6 border-t border-[#3c3c3c] pt-4 text-sm font-semibold text-neutral-300">Reference sheet</h2>
          <article data-testid="reference-sheet" className="content-html" dangerouslySetInnerHTML={{ __html: referenceHtml }} />
        </Collapsible>
        <Collapsible
          ref={feedback}
          title="Feedback"
          open={feedbackOpen}
          onToggle={() => setFeedbackOpen(!feedbackOpen)}
          testid="section-feedback"
        >
          {testing && <p className="text-sm text-neutral-400">Running the tests…</p>}
          {!testing && testError && <p className="text-sm text-rose-400">{testError}</p>}
          {!testing && !testError && checkpoint && (
            <>
              <Testcases result={checkpoint.result} />
              <p data-testid="checkpoint-status" className="mt-2 text-xs text-neutral-500">
                Checkpoint saved {new Date(checkpoint.at).toLocaleTimeString()}.
                {checkpointSync === "saving" && " Saving to your account…"}
                {checkpointSync === "saved" && " Saved to your account."}
                {checkpointSync === "failed" && " Not saved to your account yet; Submit saves every question."}
              </p>
            </>
          )}
          {!testing && !testError && !checkpoint && (
            <p className="text-sm text-neutral-500">Press Test to run the tests for question {number}. Results appear here.</p>
          )}
        </Collapsible>
      </div>

      <section aria-label="Code" className="flex min-w-0 flex-1 flex-col bg-[#1e1e1e]">
        <div role="tablist" aria-label="Files" className="flex h-9 shrink-0 items-end overflow-x-auto border-b border-[#3c3c3c] bg-[#252526]">
          {tabs.map((name) => {
            const locked = !editable.has(name);
            const selected = name === activeTab;
            return (
              <button
                key={name}
                role="tab"
                aria-selected={selected}
                data-testid={`tab-${name}`}
                data-locked={locked}
                onClick={() => setActiveTab(name)}
                className={`flex h-9 shrink-0 items-center gap-1.5 border-r border-[#3c3c3c] px-3 font-mono text-[13px] ${
                  selected ? "bg-[#1e1e1e] text-neutral-100" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {name}
                {locked && (
                  <span aria-label="read-only" title="Read-only" className="text-[11px]">
                    🔒
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1">
          {tabs.map((name) =>
            name === activeTab ? (
              <JavaEditor
                key={name}
                path={`${attemptId}/${question.id}/${name}`}
                initialText={textOf(name)}
                readOnly={locked || !editable.has(name)}
                onChange={(text) => onEdit(name, text)}
                onSave={onSaveNow}
              />
            ) : null,
          )}
        </div>

        <div className="flex h-6 shrink-0 items-center gap-4 border-t border-[#3c3c3c] bg-[#252526] px-3 font-mono text-[12px] text-neutral-400">
          <span data-testid="file-path">/home/{activeTab}</span>
          {lockReason && (
            <span data-testid="lock-reason" className="font-sans text-amber-400">
              🔒 {lockReason}
            </span>
          )}
          <span className="ml-auto font-sans" data-testid="save-status" data-status={saveStatus}>
            {saveStatus === "saved" && "All changes saved"}
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "failed" && "Not saved: this browser will not store it"}
          </span>
          <span data-testid="indentation">Spaces: 4 (Auto)</span>
        </div>

        <div className="flex h-[38%] min-h-[11rem] shrink-0 flex-col border-t border-[#3c3c3c]">
          <div className="flex h-8 shrink-0 items-center gap-3 border-b border-[#3c3c3c] bg-[#252526] px-3 text-[13px]">
            <span data-testid="panel-console" className="border-b-2 border-emerald-500 pb-0.5 text-neutral-100">
              Console
            </span>
            <StartingJava className="text-neutral-400" />
            <div className="ml-auto flex items-center gap-4">
              {running ? (
                <button type="button" data-testid="stop" className={TEXT_BUTTON} onClick={() => runConsole.current?.stop()}>
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="run"
                  className={TEXT_BUTTON}
                  disabled={!canRun || testing || javaBroken || locked}
                  title={canRun ? `Compile and run ${mainClass}.java` : `This question has no ${mainClass}.java to run`}
                  onClick={() => runConsole.current?.run()}
                >
                  Run
                </button>
              )}
              <button
                type="button"
                data-testid="test"
                className={TEXT_BUTTON}
                disabled={running || testing || javaBroken || locked}
                title="Run the tests and save a checkpoint"
                onClick={test}
              >
                {testing ? "Testing…" : "Test"}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <RunConsole ref={runConsole} files={compileSet} inputFiles={dataFiles} mainClass={mainClass} onRunningChange={setRunning} />
          </div>
        </div>
      </section>
    </div>
  );
}

const TEXT_BUTTON = "text-[13px] text-neutral-300 hover:text-white disabled:cursor-not-allowed disabled:text-neutral-600";
