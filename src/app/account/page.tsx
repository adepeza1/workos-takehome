import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import { getOrgPolicy, requireOrgContext } from "@/lib/org-context";
import { roleLabel } from "@/lib/orgs";

export default async function AccountPage() {
  const ctx = await requireOrgContext();
  const policy = await getOrgPolicy(ctx.organizationId);

  const identity: [string, string][] = [
    ["Name", [ctx.firstName, ctx.lastName].filter(Boolean).join(" ") || "—"],
    ["Email", ctx.email],
    ["User ID", ctx.userId],
  ];

  return (
    <Flex direction="column" gap="5" width="520px" maxWidth="100%">
      <Flex direction="column" gap="1">
        <Heading size="7">Account &amp; workspace</Heading>
        <Text color="gray">
          Your identity, your role in {policy.name}, and the security policy in
          force for this customer.
        </Text>
      </Flex>

      <Card size="3">
        <Flex direction="column" gap="3">
          <Heading size="3">Identity</Heading>
          {identity.map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
        </Flex>
      </Card>

      <Card size="3">
        <Flex direction="column" gap="3">
          <Heading size="3">Workspace &amp; role</Heading>
          <Row label="Organization" value={policy.name} />
          <Flex align="center" gap="6">
            <Text weight="bold" size="2" style={{ width: 140 }}>
              Role
            </Text>
            <Badge color="iris">{roleLabel(ctx.role)}</Badge>
          </Flex>
          <Flex align="start" gap="6">
            <Text weight="bold" size="2" style={{ width: 140 }}>
              Permissions
            </Text>
            <Flex gap="2" wrap="wrap">
              {ctx.permissions.length ? (
                ctx.permissions.map((p) => (
                  <Badge key={p} color="gray" variant="soft">
                    {p}
                  </Badge>
                ))
              ) : (
                <Text color="gray" size="2">
                  None — read-only
                </Text>
              )}
            </Flex>
          </Flex>
        </Flex>
      </Card>

      <Card size="3">
        <Flex direction="column" gap="3">
          <Flex align="center" justify="between">
            <Heading size="3">Security policy</Heading>
            <Badge color={policy.tier === "strict" ? "red" : "green"}>
              {policy.tier}
            </Badge>
          </Flex>
          <Text size="2" color="gray">
            Set per customer in WorkOS. Changing it here does not affect any
            other organization.
          </Text>
          <Separator size="4" />
          <Row
            label="Session limit"
            value={`${policy.sessionLimitLabel} from sign-in`}
          />
          <Flex align="center" gap="6">
            <Text weight="bold" size="2" style={{ width: 140 }}>
              MFA
            </Text>
            <Badge color={policy.mfaRequired ? "red" : "gray"} variant="soft">
              {policy.mfaRequired ? "Required" : "Not required"}
            </Badge>
          </Flex>
          {policy.note && (
            <Text size="2" color="gray">
              {policy.note}
            </Text>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Flex align="center" gap="6">
      <Text weight="bold" size="2" style={{ width: 140 }}>
        {label}
      </Text>
      <Box flexGrow="1">
        <Text size="2">{value}</Text>
      </Box>
    </Flex>
  );
}
