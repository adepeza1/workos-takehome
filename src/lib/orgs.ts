/**
 * Static registry of demo-relevant WorkOS identifiers and the RBAC vocabulary.
 *
 * Organizations, roles, and permissions are all configured in the WorkOS
 * dashboard (see scripts/seed-users.mjs and SUBMISSION.md). This file only
 * mirrors the handful of stable identifiers the app needs at the edges —
 * routing an org-scoped SSO sign-in, labeling roles, and choosing a session
 * policy fallback. Everything authoritative (a user's org, role, permissions)
 * comes from the signed session at runtime, never from here.
 */

/** Permission slugs defined in WorkOS. Mutations are gated on these. */
export const PERMISSIONS = {
  invite: "members:invite",
  remove: "members:remove",
  manageRoles: "members:manage_roles",
} as const;

export type PermissionSlug = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Roles assignable within a customer workspace, in priority order. */
export const ROLE_OPTIONS: {
  slug: string;
  label: string;
  description: string;
}[] = [
  {
    slug: "admin",
    label: "Admin",
    description: "Runs the workspace: invite, remove, and change roles.",
  },
  {
    slug: "team_lead",
    label: "Team lead",
    description: "Looks after their people: invite and remove members.",
  },
  {
    slug: "compliance",
    label: "Compliance",
    description: "Read-only oversight: sees everything, changes nothing.",
  },
  {
    slug: "member",
    label: "Member",
    description: "Standard member of the workspace.",
  },
];

export function roleLabel(slug?: string | null): string {
  if (!slug) return "—";
  return ROLE_OPTIONS.find((r) => r.slug === slug)?.label ?? slug;
}

/**
 * Organizations that expose a branded SSO shortcut on the sign-in screen.
 * Acme's IT mandated Okta; signing in with the org id routes AuthKit straight
 * to Acme's connection (the Test IdP standing in for Okta).
 */
export const SSO_ORGS: { id: string; name: string }[] = [
  { id: "org_01KZEN19E68J1TKC80KVNZH724", name: "Acme Corp" },
];

/** Fallback session ceiling when an org has no maxSessionHours metadata. */
export const DEFAULT_MAX_SESSION_HOURS = 168; // 7 days
