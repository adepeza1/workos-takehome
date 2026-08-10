import { signOut } from "@workos-inc/authkit-nextjs";
import { cookies } from "next/headers";
import { SESSION_POLICY_COOKIE } from "@/lib/session-policy";

// Hit when the per-org session ceiling has been reached. Clear our policy
// stamp and sign the user fully out of WorkOS, then bounce them back to the
// home page flagged as expired so they must authenticate again.
export const GET = async () => {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_POLICY_COOKIE);
  await signOut({ returnTo: "/?expired=1" });
};
