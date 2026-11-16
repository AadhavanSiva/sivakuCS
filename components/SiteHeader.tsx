import Link from "next/link";
import { Suspense } from "react";
import { currentSession } from "@/auth";
import { SignOutButton } from "./SignOutButton";

/** The bar above the exam list, My attempts and the privacy page. */
export function SiteHeader() {
  return (
    <header className="border-b border-neutral-500/20">
      <div className="mx-auto flex h-12 w-full max-w-3xl items-center justify-between gap-4 px-6 text-sm">
        <Link href="/" className="font-semibold">
          sivakuCS
        </Link>
        {/* Who is signed in is per request; the rest of the page can be static. */}
        <Suspense fallback={null}>
          <UserNav />
        </Suspense>
      </div>
    </header>
  );
}

async function UserNav() {
  const session = await currentSession();
  if (!session?.user?.id) {
    return (
      <Link href="/" className="underline">
        Sign in
      </Link>
    );
  }
  return (
    <nav className="flex items-center gap-4">
      <Link href="/exams" className="hover:underline">
        Exams
      </Link>
      <Link href="/attempts" data-testid="nav-attempts" className="hover:underline">
        My attempts
      </Link>
      <span data-testid="signed-in-as" className="hidden max-w-48 truncate text-neutral-500 sm:inline" title={session.user.email ?? ""}>
        {session.user.name ?? session.user.email}
      </span>
      <SignOutButton />
    </nav>
  );
}
