import Link from "next/link";

// Placeholder until Milestone 4 adds sign-in and the real landing page.
export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">sivakuCS</h1>
      <p>Practice exams for CS 18000, with Java running in your browser. Under construction.</p>
      <p>
        <Link className="underline" href="/lab">
          Try Java in the browser
        </Link>
      </p>
    </main>
  );
}
