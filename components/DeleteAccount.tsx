"use client";

import { useState, useTransition } from "react";
import { DIALOG_DANGER, DIALOG_SECONDARY, Dialog } from "@/components/workspace/Dialog";
import { deleteAccountAction } from "@/lib/actions/auth";
import { clearAllAttempts } from "@/lib/attempt-storage";

/** Deletes the account and everything stored with it, after a confirmation. */
export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <>
      <button
        type="button"
        data-testid="delete-account"
        className="self-start rounded border border-rose-600/60 px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-600/10 dark:text-rose-400"
        onClick={() => setConfirming(true)}
      >
        Delete my account and data
      </button>
      {confirming && (
        <Dialog
          title="Delete your account?"
          testid="delete-confirm"
          onDismiss={() => setConfirming(false)}
          actions={
            <>
              <button type="button" className={DIALOG_SECONDARY} onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button
                type="button"
                data-testid="delete-confirm-yes"
                className={DIALOG_DANGER}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    clearAllAttempts();
                    await deleteAccountAction();
                  })
                }
              >
                {pending ? "Deleting…" : "Delete everything"}
              </button>
            </>
          }
        >
          <p>
            Your attempts, results and saved code are deleted straight away and cannot be recovered. You can sign in again
            later and start afresh.
          </p>
        </Dialog>
      )}
    </>
  );
}
