import type { Metadata } from "next";
import { Suspense } from "react";
import { currentUserId } from "@/auth";
import { DeleteAccount } from "@/components/DeleteAccount";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Privacy · sivakuCS" };

// Exactly what is stored; keep in step with db/schema.sql.
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-6 leading-relaxed">
        <h1 className="text-2xl font-semibold">Privacy</h1>
        <p>
          sivakuCS stores only what it needs to save your practice: no analytics, no advertising, and nothing is shared
          or sold. Only you can see your attempts and code on the site.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">What is stored in your account</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Your account:</strong> the id number Google gives your Google account, and when you first signed in.
              Not your name, email address or photo.
            </li>
            <li>
              <strong>Your attempts:</strong> for each exam you start, which exam, when you started and submitted,
              whether it was timed, whether it was submitted automatically when time ran out, and your score.
            </li>
            <li>
              <strong>Your results:</strong> for each question in an attempt, your points and which test cases passed or
              failed. Each Test or Submit replaces the previous result; there is no history.
            </li>
            <li>
              <strong>Your code:</strong> for each question, only the last code you sent with Test or Submit. Each one
              replaces the previous; earlier versions are not kept.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">What stays in your browser</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              The code you are writing, until you press Test or Submit, and your timer, kept in your browser&apos;s local
              storage so a refresh loses nothing. Signing out clears it from the browser.
            </li>
            <li>
              A sign-in cookie, encrypted, holding your name and email address from Google so the site can show who is
              signed in. Signing out removes it.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">What is not stored</h2>
          <p>
            Program output, compiler messages, and the code you type but never Test or Submit. Your Java runs in your
            own browser, so your code is not sent anywhere to be run.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Services involved</h2>
          <p>
            Google handles signing in. The site is hosted on Vercel and the database on Neon; like any host, they may
            keep short-lived technical logs, such as request logs, under their own policies. The Java runtime (CheerpJ)
            is downloaded from Leaning Technologies&apos; servers when an exam opens. The site&apos;s owner can see the
            database in order to run the site.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Deleting your data</h2>
          <p>Deleting your account removes your account, attempts, results and code straight away.</p>
          <Suspense fallback={null}>
            <DeleteIfSignedIn />
          </Suspense>
        </section>
      </main>
    </>
  );
}

async function DeleteIfSignedIn() {
  const userId = await currentUserId();
  if (!userId) return <p className="text-sm text-neutral-500">Sign in to delete your account.</p>;
  return <DeleteAccount />;
}
