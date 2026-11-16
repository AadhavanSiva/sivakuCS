"use server";

// Signing in and out, and deleting an account, as form actions.
import { currentUserId, signIn, signOut } from "@/auth";
import { deleteUser } from "@/lib/db/attempts";
import { getDb } from "@/lib/db/pool";
import { testLoginEnabled } from "@/lib/test-login";

/** Where to go after signing in: a page on this site, or the exam list. */
function safeRedirect(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : "/exams";
}

export async function signInWithGoogle(formData: FormData) {
  await signIn("google", { redirectTo: safeRedirect(formData.get("redirectTo")) });
}

/** Browser tests only; see lib/test-login.ts. */
export async function signInForTests(formData: FormData) {
  if (!testLoginEnabled()) throw new Error("Test login is not enabled.");
  await signIn("test-login", { name: formData.get("name"), redirectTo: safeRedirect(formData.get("redirectTo")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

/** Deletes the signed-in user's account and everything stored with it, then signs out. */
export async function deleteAccountAction() {
  const userId = await currentUserId();
  if (userId) await deleteUser(getDb(), userId);
  await signOut({ redirectTo: "/?deleted=1" });
}
