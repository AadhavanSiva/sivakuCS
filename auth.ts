// Sign-in: Google through Auth.js, any Google account. Sessions are signed,
// encrypted cookies (JWT strategy), so the database holds no sessions: on
// first sign-in the Google account id is added to `users`, and the session
// carries our own user id from then on. Configuration comes from the
// environment: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET (README,
// Accounts).
import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { connection } from "next/server";
import { upsertUser } from "@/lib/db/attempts";
import { getDb } from "@/lib/db/pool";
import { TEST_LOGIN_NAME, testLoginEnabled } from "@/lib/test-login";

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
}

/** Pages anyone may see; everything else needs a signed-in user. */
export const PUBLIC_PATHS = ["/", "/privacy"];

const providers: NextAuthConfig["providers"] = [Google];

// Browser tests only (lib/test-login.ts): never enabled on Vercel.
if (testLoginEnabled()) {
  providers.push(
    Credentials({
      id: "test-login",
      name: "Test login",
      credentials: { name: { label: "Name" } },
      authorize(credentials) {
        const name = String(credentials?.name ?? "");
        if (!TEST_LOGIN_NAME.test(name)) return null;
        return { id: `test:${name}`, name, email: `${name}@test.invalid` };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  // Signed-out visitors are sent to the landing page, which has the button.
  pages: { signIn: "/", error: "/" },
  callbacks: {
    async jwt({ token, account }) {
      // Only at sign-in: the Google account id ("sub"), or the test name.
      if (account) {
        token.uid = await upsertUser(getDb(), account.providerAccountId);
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
    // Used by proxy.ts for every page request.
    authorized({ auth: session, request }) {
      if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) return true;
      return Boolean(session?.user?.id);
    },
  },
});

/**
 * The signed-in user's session, or null. For server components and actions.
 * connection() first marks the render as per-request, before Auth.js reads
 * the clock, so Next.js never tries to prerender a signed-in page.
 */
export async function currentSession(): Promise<Session | null> {
  await connection();
  return auth();
}

/** The signed-in user's id, or null. */
export async function currentUserId(): Promise<string | null> {
  const session = await currentSession();
  return session?.user?.id || null;
}
