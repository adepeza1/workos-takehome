import { authkitMiddleware } from "@workos-inc/authkit-nextjs";

// Gate every matched route on an authenticated session, except the public
// paths listed below. The per-org 24h session ceiling is enforced downstream
// in requireOrgContext() (see src/lib/org-context.ts), which runs on every
// protected page, action, and API route.
export default authkitMiddleware({
  middlewareAuth: {
    enabled: true,
    unauthenticatedPaths: ["/"],
  },
});

export const config = {
  matcher: ["/", "/account/:path*", "/team/:path*", "/api/:path*"],
};
