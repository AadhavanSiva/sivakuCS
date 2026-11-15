"use client";

import { useEffect, useRef, useState } from "react";
import { StartingJava } from "@/components/StartingJava";
import { Testcases } from "@/components/Testcases";
import type { Checkpoint } from "@/lib/attempt-storage";
import { filesToCompile, gradeQuestion } from "@/lib/grading/grade";
import type { Question } from "@/lib/grading/types";
import { getJava, preloadJava, useJavaRuntime } from "@/lib/java-runtime";
import type { JavaFiles } from "@/lib/java/programs";
import { JavaEditor } from "./JavaEditor";
import { RunConsole, type RunConsoleHandle } from "./RunConsole";

export type SaveStatus = "saved" | "saving" | "failed";

type Props = {
  question: Question;
  number: number;
  referenceHtml: string;
  /** The student's editable files; missing ones are taken from the starter. */
  studentFiles: JavaFiles;
  checkpoint: Checkpoint | undefined;
  saveStatus: SaveStatus;
  onEdit: (name: string, text: string) => void;
  onSaveNow: () => void;
  onTested: (checkpoint: Checkpoint) => void;
};

/** One question: the description and reference sheet, the files, and the Run / Test panel. */
export function QuestionSlide(props: Props) {
  const { question, number, referenceHtml, studentFiles, checkpoint, saveStatus, onEdit, onSaveNow, onTested } = props;
  const { meta } = question;
  const tabs = [...meta.editable, ...meta.readOnly];
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [panel, setPanel] = useState<"console" | "testcases">("console");
  const [running, setRunning] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const runConsole = useRef<RunConsoleHandle>(null);
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

  async function test() {
    setPanel("testcases");
    setTesting(true);
    setTestError(null);
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
      <section
        aria-label="Question"
        className="w-[40%] min-w-[18rem] overflow-y-auto border-r border-[#3c3c3c] bg-[#1f1f1f] px-5 py-4"
      >
        <article data-testid="question-description" className="content-html" dangerouslySetInnerHTML={{ __html: question.descriptionHtml ?? "" }} />
        <hr className="my-6 border-[#3c3c3c]" />
        <details open className="group">
          <summary className="cursor-pointer select-none text-sm font-semibold text-neutral-300">Reference sheet</summary>
          <article data-testid="reference-sheet" className="content-html mt-3" dangerouslySetInnerHTML={{ __html: referenceHtml }} />
        </details>
      </section>

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
                path={`${question.id}/${name}`}
                initialText={textOf(name)}
                readOnly={!editable.has(name)}
                onChange={(text) => onEdit(name, text)}
                onSave={onSaveNow}
              />
            ) : null,
          )}
        </div>

        <div className="flex h-6 shrink-0 items-center gap-3 border-t border-[#3c3c3c] bg-[#252526] px-3 text-[12px] text-neutral-400">
          <span data-testid="file-path" className="font-mono">
            {activeTab}
            {!editable.has(activeTab) && " (read-only)"}
          </span>
          <span className="ml-auto" data-testid="save-status" data-status={saveStatus}>
            {saveStatus === "saved" && "All changes saved"}
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "failed" && "Not saved: this browser will not store it"}
          </span>
        </div>

        <div className="flex h-[38%] min-h-[11rem] shrink-0 flex-col border-t border-[#3c3c3c] bg-[#181818]">
          <div className="flex h-9 shrink-0 items-center gap-1 border-b border-[#3c3c3c] px-2">
            <PanelTab active={panel === "console"} onClick={() => setPanel("console")} testid="panel-console">
              Console
            </PanelTab>
            <PanelTab active={panel === "testcases"} onClick={() => setPanel("testcases")} testid="panel-testcases">
              Testcases
            </PanelTab>
            <StartingJava className="ml-3 text-neutral-400" />
            <div className="ml-auto flex items-center gap-2">
              {running ? (
                <button type="button" data-testid="stop" className={BUTTON_STOP} onClick={() => runConsole.current?.stop()}>
                  Stop
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="run"
                  className={BUTTON_SECONDARY}
                  disabled={!canRun || testing || javaBroken}
                  title={canRun ? `Compile and run ${mainClass}.java` : `This question has no ${mainClass}.java to run`}
                  onClick={() => {
                    setPanel("console");
                    runConsole.current?.run();
                  }}
                >
                  ▶ Run
                </button>
              )}
              <button
                type="button"
                data-testid="test"
                className={BUTTON_PRIMARY}
                disabled={running || testing || javaBroken}
                title="Run the tests and save a checkpoint"
                onClick={test}
              >
                {testing ? "Testing…" : "Test"}
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <div className={panel === "console" ? "h-full" : "hidden"}>
              <RunConsole
                ref={runConsole}
                files={compileSet}
                inputFiles={dataFiles}
                mainClass={mainClass}
                onRunningChange={setRunning}
              />
            </div>
            <div className={panel === "testcases" ? "h-full overflow-y-auto px-3 py-2 text-neutral-200" : "hidden"}>
              {testing && <p className="text-sm text-neutral-400">Running the tests…</p>}
              {!testing && testError && <p className="text-sm text-rose-400">{testError}</p>}
              {!testing && !testError && checkpoint && (
                <>
                  <Testcases result={checkpoint.result} />
                  <p className="mt-2 text-xs text-neutral-500">
                    Checkpoint saved {new Date(checkpoint.at).toLocaleTimeString()}.
                  </p>
                </>
              )}
              {!testing && !testError && !checkpoint && (
                <p className="text-sm text-neutral-500">
                  Press Test to run the sample from the handout and the hidden cases for question {number}.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PanelTab({ active, onClick, testid, children }: { active: boolean; onClick: () => void; testid: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      data-testid={testid}
      aria-pressed={active}
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-[13px] ${active ? "bg-[#2d2d2d] text-neutral-100" : "text-neutral-400 hover:text-neutral-200"}`}
    >
      {children}
    </button>
  );
}

const BUTTON_BASE = "rounded px-3 py-1 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40";
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-emerald-600 text-white hover:bg-emerald-500`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border border-[#4a4a4a] text-neutral-100 hover:bg-[#2d2d2d]`;
const BUTTON_STOP = `${BUTTON_BASE} bg-rose-600 text-white hover:bg-rose-500`;
