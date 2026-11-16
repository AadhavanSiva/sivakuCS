"use client";

import { useTransition } from "react";
import { signOutAction } from "@/lib/actions/auth";
import { clearAllAttempts } from "@/lib/attempt-storage";

/** Signs out, first clearing every attempt kept in this browser, so the next person at it sees none of it. */
export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      data-testid="sign-out"
      className="underline disabled:opacity-50"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          clearAllAttempts();
          await signOutAction();
        })
      }
    >
      Sign out
    </button>
  );
}
