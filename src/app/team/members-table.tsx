"use client";

import { useState, useTransition } from "react";
import {
  AlertDialog,
  Badge,
  Button,
  Callout,
  Flex,
  Heading,
  Select,
  Separator,
  Table,
  Text,
  TextField,
} from "@radix-ui/themes";
import {
  CheckCircledIcon,
  CrossCircledIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import {
  changeRole,
  inviteMember,
  removeMember,
  revokeInvite,
  type ActionResult,
} from "./actions";

export interface Member {
  membershipId: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roleSlug?: string;
  status: string;
  isSelf: boolean;
}

export interface Invite {
  id: string;
  email: string;
  state: string;
  expiresAt: string;
}

export interface RoleOption {
  slug: string;
  label: string;
  description: string;
}

interface Props {
  members: Member[];
  invites: Invite[];
  roleOptions: RoleOption[];
  canInvite: boolean;
  canRemove: boolean;
  canManageRoles: boolean;
}

const ROLE_COLORS: Record<string, "iris" | "grass" | "amber" | "gray"> = {
  admin: "iris",
  team_lead: "grass",
  compliance: "amber",
  member: "gray",
};

function displayName(m: Member) {
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ");
  return name || m.email;
}

export function MembersTable({
  members,
  invites,
  roleOptions,
  canInvite,
  canRemove,
  canManageRoles,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const readOnly = !canInvite && !canRemove && !canManageRoles;

  function run(fn: () => Promise<ActionResult>) {
    startTransition(async () => setResult(await fn()));
  }

  return (
    <Flex direction="column" gap="4" width="100%">
      {readOnly && (
        <Callout.Root color="amber" variant="surface">
          <Callout.Icon>
            <LockClosedIcon />
          </Callout.Icon>
          <Callout.Text>
            Read-only oversight. Your role can see everyone in the workspace but
            cannot change anything — the controls below are hidden and every
            mutation is refused on the server.
          </Callout.Text>
        </Callout.Root>
      )}

      {result && (
        <Callout.Root
          color={result.ok ? "grass" : "red"}
          variant="surface"
          role="status"
        >
          <Callout.Icon>
            {result.ok ? <CheckCircledIcon /> : <CrossCircledIcon />}
          </Callout.Icon>
          <Callout.Text>
            {result.ok ? result.message : result.error}
          </Callout.Text>
        </Callout.Root>
      )}

      {canInvite && (
        <InviteForm
          roleOptions={roleOptions}
          canAssignRoles={canManageRoles}
          pending={pending}
          onInvite={(email, roleSlug) =>
            run(() => inviteMember({ email, roleSlug }))
          }
        />
      )}

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Member</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            {canRemove && (
              <Table.ColumnHeaderCell align="right">
                Actions
              </Table.ColumnHeaderCell>
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {members.map((m) => (
            <Table.Row key={m.membershipId} align="center">
              <Table.Cell>
                <Flex direction="column">
                  <Text weight="medium">
                    {displayName(m)}
                    {m.isSelf && (
                      <Text color="gray" size="1">
                        {" "}
                        (you)
                      </Text>
                    )}
                  </Text>
                  <Text size="1" color="gray">
                    {m.email}
                  </Text>
                </Flex>
              </Table.Cell>
              <Table.Cell>
                {canManageRoles && !m.isSelf ? (
                  <Select.Root
                    defaultValue={m.roleSlug ?? "member"}
                    disabled={pending}
                    onValueChange={(roleSlug) =>
                      run(() =>
                        changeRole({ membershipId: m.membershipId, roleSlug }),
                      )
                    }
                  >
                    <Select.Trigger variant="soft" />
                    <Select.Content>
                      {roleOptions.map((r) => (
                        <Select.Item key={r.slug} value={r.slug}>
                          {r.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                ) : (
                  <Badge color={ROLE_COLORS[m.roleSlug ?? "member"] ?? "gray"}>
                    {roleOptions.find((r) => r.slug === m.roleSlug)?.label ??
                      m.roleSlug ??
                      "Member"}
                  </Badge>
                )}
              </Table.Cell>
              <Table.Cell>
                <Badge
                  color={m.status === "active" ? "green" : "gray"}
                  variant="soft"
                >
                  {m.status}
                </Badge>
              </Table.Cell>
              {canRemove && (
                <Table.Cell align="right">
                  {!m.isSelf && (
                    <RemoveButton
                      name={displayName(m)}
                      pending={pending}
                      onConfirm={() => run(() => removeMember(m.membershipId))}
                    />
                  )}
                </Table.Cell>
              )}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {invites.length > 0 && (
        <Flex direction="column" gap="2">
          <Separator size="4" />
          <Heading size="3">Pending invitations</Heading>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                {canInvite && (
                  <Table.ColumnHeaderCell align="right">
                    Actions
                  </Table.ColumnHeaderCell>
                )}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {invites.map((inv) => (
                <Table.Row key={inv.id} align="center">
                  <Table.Cell>{inv.email}</Table.Cell>
                  <Table.Cell>
                    <Badge color="blue" variant="soft">
                      {inv.state}
                    </Badge>
                  </Table.Cell>
                  {canInvite && (
                    <Table.Cell align="right">
                      <Button
                        size="1"
                        variant="soft"
                        color="gray"
                        disabled={pending}
                        onClick={() => run(() => revokeInvite(inv.id))}
                      >
                        Revoke
                      </Button>
                    </Table.Cell>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Flex>
      )}
    </Flex>
  );
}

function InviteForm({
  roleOptions,
  canAssignRoles,
  pending,
  onInvite,
}: {
  roleOptions: RoleOption[];
  canAssignRoles: boolean;
  pending: boolean;
  onInvite: (email: string, roleSlug: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [roleSlug, setRoleSlug] = useState("member");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!email.trim()) return;
        onInvite(email, roleSlug);
        setEmail("");
        setRoleSlug("member");
      }}
    >
      <Flex gap="3" align="end" wrap="wrap">
        <Flex direction="column" gap="1" style={{ minWidth: 260 }}>
          <Text size="1" weight="bold" color="gray">
            Invite someone to this workspace
          </Text>
          <TextField.Root
            type="email"
            placeholder="person@acme.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Flex>
        {canAssignRoles && (
          <Flex direction="column" gap="1">
            <Text size="1" weight="bold" color="gray">
              Role
            </Text>
            <Select.Root value={roleSlug} onValueChange={setRoleSlug}>
              <Select.Trigger />
              <Select.Content>
                {roleOptions.map((r) => (
                  <Select.Item key={r.slug} value={r.slug}>
                    {r.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        )}
        <Button type="submit" disabled={pending}>
          Send invite
        </Button>
      </Flex>
    </form>
  );
}

function RemoveButton({
  name,
  pending,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Button size="1" variant="soft" color="red" disabled={pending}>
          Remove
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="420px">
        <AlertDialog.Title>Remove {name}?</AlertDialog.Title>
        <AlertDialog.Description size="2">
          They lose access to this workspace immediately. Their WorkOS user
          account is not deleted, and they can be re-invited later.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <Button color="red" onClick={onConfirm}>
              Remove member
            </Button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
