import { Badge, Callout, Flex, Heading, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import {
  getMembers,
  getOrgPolicy,
  getPendingInvitations,
  requireOrgContext,
} from "@/lib/org-context";
import { PERMISSIONS, ROLE_OPTIONS, roleLabel } from "@/lib/orgs";
import { MembersTable } from "./members-table";

export default async function TeamPage() {
  const ctx = await requireOrgContext();
  const [policy, members, invites] = await Promise.all([
    getOrgPolicy(ctx.organizationId),
    getMembers(ctx.organizationId, ctx.userId),
    getPendingInvitations(ctx.organizationId),
  ]);

  return (
    <Flex direction="column" gap="5" width="720px" maxWidth="100%">
      <Flex direction="column" gap="2">
        <Flex align="center" gap="3" wrap="wrap">
          <Heading size="7">{policy.name}</Heading>
          <Badge color="iris" variant="soft" size="2">
            You are {roleLabel(ctx.role)}
          </Badge>
        </Flex>
        <Text color="gray">
          Everyone in {policy.name}&rsquo;s workspace — scoped to your
          organization only. You have no visibility into any other customer.
        </Text>
      </Flex>

      <Callout.Root variant="surface" color="gray">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          This list is fetched server-side using the organization id from your
          session ({ctx.organizationId}). It is never taken from the URL or the
          browser, so one tenant can&rsquo;t read or change another&rsquo;s
          members.
        </Callout.Text>
      </Callout.Root>

      <MembersTable
        members={members}
        invites={invites}
        roleOptions={ROLE_OPTIONS}
        canInvite={ctx.can(PERMISSIONS.invite)}
        canRemove={ctx.can(PERMISSIONS.remove)}
        canManageRoles={ctx.can(PERMISSIONS.manageRoles)}
      />
    </Flex>
  );
}
