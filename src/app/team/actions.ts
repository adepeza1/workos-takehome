"use server";

/**
 * Member-management server actions — the enforcement boundary for the whole
 * demo. Three invariants hold for every action here:
 *
 *   1. Authorization is re-checked server-side from the signed session, not
 *      trusted from the client. Hiding a button in the UI is not enough; a
 *      compliance user who forges the request still gets a 403 here.
 *   2. The organization is taken from the session (requireOrgContext), never
 *      from the client. A membership id supplied by the client is verified to
 *      belong to the caller's org before anything touches it — that check is
 *      what stops one tenant from mutating another's members.
 *   3. Role assignment is a distinct, higher privilege than invite/remove.
 */

import { revalidatePath } from "next/cache";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { requireOrgContext } from "@/lib/org-context";
import { PERMISSIONS, ROLE_OPTIONS } from "@/lib/orgs";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

const ASSIGNABLE_ROLES = new Set(ROLE_OPTIONS.map((r) => r.slug));

function deny(action: string): ActionResult {
  return {
    ok: false,
    error: `Your role can't ${action}. This is enforced on the server.`,
  };
}

/**
 * Confirm a membership belongs to the caller's organization before acting on
 * it. Throws (caught by the action) if it belongs to another tenant or the id
 * is bogus — the cross-tenant write guard.
 */
async function assertMembershipInOrg(membershipId: string, organizationId: string) {
  const membership =
    await getWorkOS().userManagement.getOrganizationMembership(membershipId);
  if (membership.organizationId !== organizationId) {
    throw new Error("Membership does not belong to your organization");
  }
  return membership;
}

export async function inviteMember(input: {
  email: string;
  roleSlug: string;
}): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  if (!ctx.can(PERMISSIONS.invite)) return deny("invite members");

  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  // Assigning any role other than the default member requires the higher
  // manage-roles permission. Team leads can invite, but only as members.
  let roleSlug = input.roleSlug || "member";
  if (!ASSIGNABLE_ROLES.has(roleSlug)) roleSlug = "member";
  if (roleSlug !== "member" && !ctx.can(PERMISSIONS.manageRoles)) {
    return deny("invite members with a role other than Member");
  }

  try {
    await getWorkOS().userManagement.sendInvitation({
      email,
      organizationId: ctx.organizationId,
      roleSlug,
    });
    revalidatePath("/team");
    return { ok: true, message: `Invitation sent to ${email}.` };
  } catch (e) {
    return { ok: false, error: messageOf(e) };
  }
}

export async function removeMember(membershipId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  if (!ctx.can(PERMISSIONS.remove)) return deny("remove members");

  try {
    const membership = await assertMembershipInOrg(
      membershipId,
      ctx.organizationId,
    );
    if (membership.userId === ctx.userId) {
      return { ok: false, error: "You can't remove yourself." };
    }
    await getWorkOS().userManagement.deleteOrganizationMembership(membershipId);
    revalidatePath("/team");
    return { ok: true, message: "Member removed from the workspace." };
  } catch (e) {
    return { ok: false, error: messageOf(e) };
  }
}

export async function changeRole(input: {
  membershipId: string;
  roleSlug: string;
}): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  if (!ctx.can(PERMISSIONS.manageRoles)) return deny("change roles");

  if (!ASSIGNABLE_ROLES.has(input.roleSlug)) {
    return { ok: false, error: "Unknown role." };
  }

  try {
    const membership = await assertMembershipInOrg(
      input.membershipId,
      ctx.organizationId,
    );
    if (membership.userId === ctx.userId) {
      return { ok: false, error: "You can't change your own role." };
    }
    await getWorkOS().userManagement.updateOrganizationMembership(
      input.membershipId,
      { roleSlug: input.roleSlug },
    );
    revalidatePath("/team");
    return { ok: true, message: "Role updated." };
  } catch (e) {
    return { ok: false, error: messageOf(e) };
  }
}

export async function revokeInvite(invitationId: string): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  if (!ctx.can(PERMISSIONS.invite)) return deny("revoke invitations");

  try {
    const invitation =
      await getWorkOS().userManagement.getInvitation(invitationId);
    if (invitation.organizationId !== ctx.organizationId) {
      throw new Error("Invitation does not belong to your organization");
    }
    await getWorkOS().userManagement.revokeInvitation(invitationId);
    revalidatePath("/team");
    return { ok: true, message: "Invitation revoked." };
  } catch (e) {
    return { ok: false, error: messageOf(e) };
  }
}

function messageOf(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return "Something went wrong.";
}
