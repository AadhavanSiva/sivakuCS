// Sign-in is required: every page except the landing page and the privacy
// page sends a signed-out visitor to the landing page (the `authorized`
// callback in auth.ts decides). The data itself is guarded separately: every
// server action and data page checks the session again on the server.
export { auth as proxy } from "@/auth";

export const config = {
  // Pages only: not Auth.js's routes, Next's assets, or static files such as
  // the CheerpJ worker, the sandbox jar and Monaco.
  matcher: ["/((?!api/auth|_next/|favicon\\.ico|cheerpj/|monaco/|.*\\.[A-Za-z0-9]+$).*)"],
};
