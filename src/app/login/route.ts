import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { SSO_ORGS } from "@/lib/orgs";

/**
 * Start sign-in. With `?organizationId=<known org>` we route AuthKit straight
 * into that organization's SSO connection (Acme's Okta stand-in) — the org id
 * is validated against a known allowlist so a caller can't inject an arbitrary
 * one. Without it, AuthKit shows the standard sign-in (password / SSO).
 */
export const GET = async (request: NextRequest) => {
  const requested = request.nextUrl.searchParams.get("organizationId");
  const organizationId =
    requested && SSO_ORGS.some((o) => o.id === requested)
      ? requested
      : undefined;

  const signInUrl = await getSignInUrl(
    organizationId ? { organizationId } : undefined,
  );

  return redirect(signInUrl);
};
