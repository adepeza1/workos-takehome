# Submission

## 1. Links

- **Deployed app**: _TODO — Vercel URL (see “Deploying” at the bottom)_
- **Repo**: _TODO — your repo URL_
- **Video**: _TODO — 5–10 min walkthrough_

## 2. Test credentials

The demo tenant is **Acme Corp**, and Acme's IT mandated that every employee
signs in through their own Okta — so all three Acme roles authenticate through
SSO (the WorkOS **Test IdP** stands in for Okta; no password). The strict-policy
prospect, **Northwind**, is a separate tenant used to prove per-customer policy;
its admin uses password + MFA.

| Role | Email | Password | What to try while logged in as this user |
| ---- | ----- | -------- | ---------------------------------------- |
| **Admin** (Acme) | admin@acme.com | *SSO — no password* | On the home page click **“Sign in with Acme Corp SSO”** → Test IdP → enter `admin@acme.com`. On **/team**: invite someone, change a member's role, remove a member. Full control. |
| **Team lead** (Acme) | lead@acme.com | *SSO — no password* | Sign in the same SSO way as `lead@acme.com`. On **/team** you can invite and remove people, but there's no role dropdown — team leads can't change roles or promote to admin (enforced server-side). |
| **Compliance** (Acme) | compliance@acme.com | *SSO — no password* | Sign in via SSO as `compliance@acme.com`. **/team** is fully read-only: no invite box, no remove buttons, no role controls. Every mutation is refused on the server even if forced. |
| **Admin** (Northwind — strict prospect) | admin@northwind.com | `MeridianDemo!2026` | Use the standard **“Sign in”** button, password, then enroll MFA (required). Visit **/account** to see this tenant's policy: **MFA required** and a **24-hour** session limit — neither of which applies to Acme. |

> Acme roles are SSO-only because Acme has `domainSsoRequired` set (password auth
> disabled for the org). That is the point of requirement #4, so it's intentional.
> If you'd rather test the RBAC differences with passwords, they're demonstrated
> on the same tenant regardless of sign-in method.

## 3. Requirement map

| Scenario requirement | Where it's addressed (route / file / dashboard surface) | Notes on interpretation |
| -------------------- | ------------------------------------------------------- | ----------------------- |
| **1. Each customer is its own walled-off workspace; zero cross-tenant visibility** | `src/lib/org-context.ts` (`requireOrgContext`, `getMembers`) — org id comes only from the signed session and is passed into every WorkOS call. `/team` page. WorkOS **Organizations**. Verified by `scripts/verify-isolation.mjs`. | The org boundary lives on the server, keyed off the session. Membership ids from the client are re-checked against the session org (`assertMembershipInOrg`) before any write, so a forged id can't reach another tenant. |
| **2. Admins self-serve invite / remove / change access, no ticket** | `src/app/team/actions.ts` (`inviteMember`, `removeMember`, `changeRole`, `revokeInvite`) + `src/app/team/members-table.tsx`. WorkOS **User Management** (invitations, memberships). | Fully in-app. Pending invitations render inline so a newly invited seat is immediately visible. |
| **3. Three roles: admin / team lead / compliance (read-only)** | WorkOS **Roles & Permissions**: `admin` = `members:invite`+`members:remove`+`members:manage_roles`; `team_lead` = `members:invite`+`members:remove`; `compliance` = *no* permissions. Enforced in `actions.ts` and reflected in the UI. | Named them admin / team lead / compliance. The compliance requirement is a *negative* one — the proof is that mutations are refused server-side, not just hidden. Role-assignment is treated as a higher privilege than invite/remove, so a team lead can invite but only as a Member. True “team lead sees only *their own* people” needs Groups/FGA — see cut list. |
| **4. Sign in through Acme's Okta (dealbreaker)** | WorkOS **SSO connection** on Acme via the **Test IdP**; `domainSsoRequired` on the org. `src/app/login/route.ts` routes `?organizationId=<Acme>` straight into Acme's connection. Verified by `scripts/verify-auth.mjs` (password refused → `sso_required`). | Every Acme employee is forced through SSO, not just admins — matches “no Okta, no deal.” Test IdP is the sanctioned Okta stand-in. |
| **5. 24h sessions + admin MFA for ONE customer, others unchanged** | **MFA**: native per-org via `nonDomainMfaRequired`/`domainMfaRequired` on Northwind (verified: `mfa_enrollment` at sign-in). **24h session**: app-layer enforcement — `src/lib/session-policy.ts` (signed stamp) + `requireOrgContext` + `src/app/callback/route.ts` + `src/app/session-expired/route.ts`. Policy read from org **metadata** (`maxSessionHours`). | See Pushback: WorkOS enforces MFA per-org natively, but session *length* is only environment-wide, so I enforce the 24h ceiling in the app, per-org, driven by org metadata. Acme = 168h, Northwind = 24h; the two never affect each other. |
| **6. “Can the demo just call the WorkOS API from the frontend with the key?”** | Answered in Pushback below; the whole app is built the opposite way. | The API key is a workspace-wide admin credential. See Pushback. |
| **7. (Bonus) Slack ping on seat changes** | Not built — see Cut list. | Explicitly optional; `actions.ts` is the natural single hook point when it's added. |

## 4. Decision log

- **Tools used**: Claude Code (Opus 4.8) driving the build, the **WorkOS MCP
  server** (control-plane: created/edited orgs, roles, permissions, per-org MFA,
  metadata) and the **WorkOS agent skills**. The WorkOS Node SDK (`@workos-inc/node`)
  for the app's data layer and the seed/verify scripts.
- **Two or three things the AI produced that I kept, and why**:
  - `requireOrgContext()` as a single tenant-isolation choke point
    (`src/lib/org-context.ts`). Every protected surface derives its org from the
    session there, so “did we scope by org?” has exactly one place to audit.
  - The app-layer 24h session design (`session-policy.ts`): a signed, httpOnly
    stamp written once at sign-in and never rewritten on refresh, checked on every
    protected request. It's the honest answer to a real platform gap (below).
  - The headless verification scripts (`scripts/verify-isolation.mjs`,
    `verify-auth.mjs`) — they prove isolation, the cross-tenant guard, SSO
    enforcement, and per-org MFA without a browser, and doubled as the demo script.
- **Two or three things I rejected or reworked, and why**:
  - Original plan assumed **password logins for the Acme roles**. Probing auth
    (`verify-auth.mjs`) returned `sso_required` — Acme has `domainSsoRequired` on.
    Reworked the credential story to “Acme is Okta-only,” which is actually truer
    to the brief.
  - Original plan used a single coarse `members:manage` permission. The environment
    already had finer-grained `members:invite` / `members:remove` /
    `members:manage_roles`; kept those and made role-assignment a strictly higher
    privilege, which gave a cleaner three-tier RBAC story.
  - Considered the drop-in **User Management widget**; chose a custom UI + server
    actions instead so the compliance *read-only* case and the tenant boundary are
    provable server-side rather than trusted to a widget.
- **The prompt/technique that paid off most**: verifying platform capabilities
  against the **live MCP control plane before designing**, not from memory. That's
  what surfaced the per-org session-length gap (#5) and the SSO-required posture
  (#4) early, instead of discovering them during the demo.
- **The worst thing the AI gave you**: the first plan over-promised on #5 —
  it implied session length was a per-org toggle like MFA. It isn't. Caught it by
  checking `updateAuthkitSettings` vs `updateOrganizationUserlandSettings`, which
  forced the (better) app-layer enforcement approach.

## 5. Pushback

- **“Just call the WorkOS API from the frontend with the API key.”** I'd push back
  hard. The secret key is a workspace-wide admin credential — anyone who loads the
  page can read it from the browser and then list, invite, or remove members in
  *any* organization. That collapses exactly the walled-off boundary Priya said is
  the whole point (“if someone at Acme can see another customer's members, we're
  done”). This demo does the opposite: the key stays server-side, and every request
  is scoped to the caller's org from their signed session. The one backend piece is
  what makes multi-tenant isolation real instead of browser-enforced.
- **Session-length policy is not per-organization in WorkOS today.** MFA is
  (natively, and I used it); session *duration* is an environment-wide AuthKit
  setting. So “24h for one customer, unchanged for the rest” can't be a single
  dashboard toggle. I enforced it in the app, per-org, from org metadata — which
  works and is demoable — but if this matters at scale I'd raise per-org session
  policy with WorkOS rather than have every customer reimplement it.
- **“Team leads look after their own people.”** Native RBAC is org-wide, so a team
  lead currently manages everyone in the org, not a sub-group. Real per-team scoping
  wants Directory groups or FGA; I'd scope that with them rather than fake it.

## 6. Cut list (what I'd do next, roughly in order)

1. **Slack seat-change notifications (#7 bonus)** via WorkOS **Pipes** →
   `#customer-success`. `src/app/team/actions.ts` is the single hook point.
2. **Sub-team scoping for team leads** (Directory groups / FGA) so “their own
   people” is literally enforced.
3. **Audit surface for compliance** — compliance can already *see* members;
   surface WorkOS **Audit Logs** so they can see seat changes over time.
4. **Self-serve SSO/domain setup** via the Admin Portal / SSO widget, so a new
   customer's IT can wire their own Okta without us.
5. **Tighten the 24h enforcement** with a background session-revocation sweep in
   addition to the on-request check.

---

## Deploying (how to finish the Links section)

1. `vercel` (or import the repo in the Vercel dashboard).
2. Set env vars in Vercel: `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`,
   `WORKOS_COOKIE_PASSWORD`, and `NEXT_PUBLIC_WORKOS_REDIRECT_URI=https://<your-domain>/callback`.
3. In the WorkOS dashboard → **Redirects**, add `https://<your-domain>/callback`
   as a sign-in callback and set the app homepage to `https://<your-domain>`.
4. Redeploy, then fill in the Links section above and record the walkthrough.
