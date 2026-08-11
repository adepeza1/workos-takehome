import { handleAuth } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { resolveMaxSessionHours } from "@/lib/org-context";
import {
  SESSION_POLICY_COOKIE,
  encodeSessionPolicy,
} from "@/lib/session-policy";

// On a successful sign-in, stamp a signed cookie with the authentication time
// and the org's session ceiling. This is the source of truth for the per-org
// 24h expiry: it is written once here and read (never rewritten) on every
// protected request, so token refreshes don't extend the original session.
export const GET = handleAuth({
  onSuccess: async ({ organizationId }) => {
    if (!organizationId) return;
    // Never let stamping the policy cookie block a sign-in. If it fails, the
    // session simply has no ceiling stamp; requireOrgContext fails open (no
    // enforced expiry) rather than locking the user out.
    try {
      const maxHours = await resolveMaxSessionHours(organizationId);
      const value = encodeSessionPolicy({ authAtMs: Date.now(), maxHours });
      const cookieStore = await cookies();
      cookieStore.set(SESSION_POLICY_COOKIE, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        // Must outlive the policy window, not equal it: the stamp has to still
        // be readable at the moment the session expires so we can bounce the
        // user. If maxAge == the window, the cookie vanishes exactly when we
        // need it and enforcement fails open. 30 days comfortably covers both
        // the 24h policy and the compressed demo value.
        maxAge: 60 * 60 * 24 * 30,
      });
    } catch (e) {
      console.error("Failed to stamp session policy cookie:", e);
    }
  },
});
