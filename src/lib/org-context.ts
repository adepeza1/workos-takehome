/**
 * The tenant-isolation choke point.
 *
 * Every protected surface (the team page, its server actions, the account
 * page, API routes) resolves its organization through requireOrgContext(). The
 * organization id comes from the signed session — never from a query param,
 * form field, or anything the client controls — and every WorkOS read/write
 * below takes that id explicitly. If a code path forgets to scope by org, it
 * has to go around this module, which is the thing to grep for in review.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { withAuth, getWorkOS } from "@workos-inc/authkit-nextjs";
import {
  SESSION_POLICY_COOKIE,
  evaluateSessionPolicy,
} from "./session-policy";
import { DEFAULT_MAX_SESSION_HOURS, PERMISSIONS } from "./orgs";

export interface OrgContext {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  organizationId: string;
  role?: string;
  roles: string[];
  permissions: string[];
  /** True if the caller holds the given permission slug. */
  can: (permission: string) => boolean;
  /** True if the caller may perform any member mutation. */
  canManageMembers: boolean;
}

/**
 * Resolve the caller's organization context or redirect. Enforces sign-in and
 * the per-org 24h session ceiling (see session-policy.ts).
 */
export async function requireOrgContext(): Promise<OrgContext> {
  const auth = await withAuth({ ensureSignedIn: true });

  if (!auth.organizationId) {
    // A signed-in user with no active organization has nothing to scope to.
    redirect("/no-organization");
  }

  const cookieStore = await cookies();
  const stamp = cookieStore.get(SESSION_POLICY_COOKIE)?.value;
  const age = evaluateSessionPolicy(stamp, Date.now());
  if (age?.expired) {
    redirect("/session-expired");
  }

  const permissions = auth.permissions ?? [];
  const can = (permission: string) => permissions.includes(permission);

  return {
    userId: auth.user.id,
    email: auth.user.email,
    firstName: auth.user.firstName,
    lastName: auth.user.lastName,
    organizationId: auth.organizationId,
    role: auth.role,
    roles: auth.roles ?? (auth.role ? [auth.role] : []),
    permissions,
    can,
    canManageMembers:
      can(PERMISSIONS.invite) ||
      can(PERMISSIONS.remove) ||
      can(PERMISSIONS.manageRoles),
  };
}

export interface OrgPolicy {
  name: string;
  maxSessionHours: number;
  /** Human-readable session limit, e.g. "24 hours" or "30 seconds". */
  sessionLimitLabel: string;
  tier: string;
  mfaRequired: boolean;
  note?: string;
}

/** Render a duration in hours as the largest sensible unit for display. */
function formatSessionLimit(hours: number): string {
  const seconds = Math.round(hours * 3600);
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.round(hours * 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const whole = Math.round(hours);
  return `${whole} hour${whole === 1 ? "" : "s"}`;
}

/** Read an org's display policy from its WorkOS metadata. */
export async function getOrgPolicy(organizationId: string): Promise<OrgPolicy> {
  const org = await getWorkOS().organizations.getOrganization(organizationId);
  const metadata = (org.metadata ?? {}) as Record<string, string>;
  const parsed = Number(metadata.maxSessionHours);
  const maxSessionHours = Number.isFinite(parsed)
    ? parsed
    : DEFAULT_MAX_SESSION_HOURS;
  const tier = metadata.policyTier ?? "standard";
  return {
    name: org.name,
    maxSessionHours,
    sessionLimitLabel: formatSessionLimit(maxSessionHours),
    tier,
    mfaRequired: tier === "strict",
    note: metadata.policyNote,
  };
}

/** Session ceiling (hours) for an org, from metadata, with a safe fallback. */
export async function resolveMaxSessionHours(
  organizationId: string,
): Promise<number> {
  try {
    const policy = await getOrgPolicy(organizationId);
    return policy.maxSessionHours;
  } catch {
    return DEFAULT_MAX_SESSION_HOURS;
  }
}

export interface MemberRow {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleSlug?: string;
  status: string;
  isSelf: boolean;
}

/**
 * List the members of an organization — strictly scoped to the passed org id.
 * Joins organization memberships (for role + status) with user profiles.
 */
export async function getMembers(
  organizationId: string,
  selfUserId: string,
): Promise<MemberRow[]> {
  const workos = getWorkOS();
  const [memberships, users] = await Promise.all([
    workos.userManagement.listOrganizationMemberships({
      organizationId,
      limit: 100,
    }),
    workos.userManagement.listUsers({ organizationId, limit: 100 }),
  ]);

  const usersById = new Map(users.data.map((u) => [u.id, u]));

  return memberships.data.map((m) => {
    const user = usersById.get(m.userId);
    return {
      membershipId: m.id,
      userId: m.userId,
      email: user?.email ?? m.userId,
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      roleSlug: m.role?.slug,
      status: m.status,
      isSelf: m.userId === selfUserId,
    };
  });
}

export interface PendingInvite {
  id: string;
  email: string;
  state: string;
  expiresAt: string;
}

/** Pending invitations for an org, so newly invited seats are visible. */
export async function getPendingInvitations(
  organizationId: string,
): Promise<PendingInvite[]> {
  const invitations = await getWorkOS().userManagement.listInvitations({
    organizationId,
    limit: 100,
  });
  return invitations.data
    .filter((i) => i.state === "pending")
    .map((i) => ({
      id: i.id,
      email: i.email,
      state: i.state,
      expiresAt: i.expiresAt,
    }));
}
