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
    const maxHours = await resolveMaxSessionHours(organizationId);
    const value = encodeSessionPolicy({ authAtMs: Date.now(), maxHours });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_POLICY_COOKIE, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: maxHours * 60 * 60,
    });
  },
});
