import Link from "next/link";
import { Suspense } from "react";
import { currentUserId } from "@/auth";
import { signInForTests, signInWithGoogle } from "@/lib/actions/auth";
import { testLoginEnabled } from "@/lib/test-login";

// The landing page: the only page, with the privacy page, that a signed-out
// visitor can see (proxy.ts). Signed-out visitors sent here from another
// page come back to it after signing in.

const ERRORS: Record<string, string> = {
  AccessDenied: "That Google account could not sign in.",
  Configuration: "Sign-in is not set up correctly on this site yet.",
};

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 p-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold">sivakuCS</h1>
        <p className="text-lg">Practice exams for CS 18000, in a workspace like the real one.</p>
        <ul className="list-disc space-y-1 pl-5 text-neutral-600 dark:text-neutral-400">
          <li>Write Java in the browser, run it, and press Test to see how it scores.</li>
          <li>Sit a whole exam against a 60-minute timer, or untimed.</li>
          <li>Your results and your last submitted code are saved to your account.</li>
        </ul>
      </div>
      <Suspense fallback={<div className="h-10" />}>
        <SignIn searchParams={searchParams} />
      </Suspense>
      <p className="text-sm text-neutral-500">
        Signing in uses your Google account. See{" "}
        <Link href="/privacy" className="underline">
          what is stored
        </Link>
        .
      </p>
    </main>
  );
}

/** "/exams/cs180/samples" from Auth.js's callbackUrl (a full URL on this site), or the exam list. */
function returnPath(callbackUrl: string | string[] | undefined): string {
  if (typeof callbackUrl !== "string") return "/exams";
  try {
    const url = new URL(callbackUrl, "http://site.invalid");
    return url.pathname === "/" ? "/exams" : `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/exams";
  }
}

async function SignIn({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const [params, userId] = await Promise.all([searchParams, currentUserId()]);
  if (userId) {
    return (
      <p className="flex flex-wrap gap-3">
        <Link href="/exams" data-testid="go-to-exams" className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500">
          Practice exams
        </Link>
        <Link href="/attempts" className="rounded border border-neutral-500/40 px-4 py-2 hover:border-emerald-600">
          My attempts
        </Link>
      </p>
    );
  }

  const redirectTo = returnPath(params.callbackUrl);
  const error = typeof params.error === "string" ? (ERRORS[params.error] ?? "Sign-in did not work. Please try again.") : null;
  return (
    <div className="flex flex-col gap-3">
      {params.deleted === "1" && (
        <p data-testid="account-deleted" className="text-sm text-emerald-700 dark:text-emerald-400">
          Your account and everything stored with it have been deleted.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      <form action={signInWithGoogle}>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          data-testid="sign-in-google"
          className="rounded bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
        >
          Sign in with Google
        </button>
      </form>
      {testLoginEnabled() && (
        // Browser tests only (lib/test-login.ts); never on Vercel.
        <form action={signInForTests} data-testid="test-login" className="flex gap-2 text-sm">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input name="name" aria-label="Test user name" placeholder="test user name" className="rounded border border-neutral-500/40 px-2 py-1" />
          <button type="submit" className="rounded border border-neutral-500/40 px-3 py-1">
            Test sign-in
          </button>
        </form>
      )}
    </div>
  );
}
