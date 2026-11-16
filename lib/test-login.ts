// The browser tests cannot sign in with Google, so with SIVAKU_TEST_LOGIN=1
// the site also offers a "test login" that signs in as any made-up name.
// It exists only for `npm run test:e2e` on a developer's machine or in CI:
// on Vercel, or in a production build, setting it stops the site with an
// error rather than opening a way in without Google.

export function testLoginEnabled(): boolean {
  if (process.env.SIVAKU_TEST_LOGIN !== "1") return false;
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error("SIVAKU_TEST_LOGIN is for local browser tests only; remove it from this environment.");
  }
  return true;
}

/** Test login names: short, lower-case, so they cannot look like a Google account id. */
export const TEST_LOGIN_NAME = /^[a-z][a-z0-9-]{0,39}$/;
