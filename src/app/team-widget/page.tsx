import NextLink from "next/link";
import { Badge, Callout, Flex, Heading, Link, Text } from "@radix-ui/themes";
import { InfoCircledIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { getOrgPolicy, requireOrgContext } from "@/lib/org-context";
import { roleLabel } from "@/lib/orgs";
import { UsersWidget } from "./users-widget";

// Alternative to /team built on the drop-in WorkOS widget, so the two
// approaches can be compared side by side. The widget is authorized with an
// org-scoped token minted here on the server from the signed session — the org
// id still never comes from the client.
export default async function TeamWidgetPage() {
  const ctx = await requireOrgContext();
  const policy = await getOrgPolicy(ctx.organizationId);

  // The widget requires the admin-only `widgets:users-table:manage` scope, so
  // token minting fails for team leads and compliance. That failure is itself
  // instructive — the widget has no read-only mode.
  let authToken: string | null = null;
  let tokenError: string | null = null;
  try {
    authToken = await getWorkOS().widgets.getToken({
      userId: ctx.userId,
      organizationId: ctx.organizationId,
      scopes: ["widgets:users-table:manage"],
    });
  } catch (e) {
    tokenError = e instanceof Error ? e.message : "Could not mint a widget token.";
  }

  return (
    <Flex direction="column" gap="5" width="720px" maxWidth="100%">
      <Flex direction="column" gap="2">
        <Flex align="center" gap="3" wrap="wrap">
          <Heading size="7">{policy.name}</Heading>
          <Badge color="iris" variant="soft" size="2">
            You are {roleLabel(ctx.role)}
          </Badge>
          <Badge color="gray" variant="soft" size="2">
            WorkOS widget
          </Badge>
        </Flex>
        <Text color="gray">
          The same members list, rendered by the drop-in WorkOS User Management
          widget instead of hand-built UI. Compare with the{" "}
          <Link asChild>
            <NextLink href="/team">custom implementation</NextLink>
          </Link>
          .
        </Text>
      </Flex>

      <Callout.Root variant="surface" color="iris">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          This page is an evaluation, not the shipped product. The app ships the
          custom{" "}
          <Link asChild>
            <NextLink href="/team">/team</NextLink>
          </Link>{" "}
          UI because the brief needs a read-only compliance role and a team lead
          who can invite but not change roles — and this widget has a single
          manage-or-nothing permission (<code>widgets:users-table:manage</code>)
          with no read-only mode. The widget is the right tool when all you need
          is admin user management; here the RBAC requirements exceed it.
        </Callout.Text>
      </Callout.Root>

      {authToken ? (
        <>
          <Callout.Root variant="surface" color="gray">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              This entire table is the WorkOS widget — no table, dialog, or
              action code of our own. It&rsquo;s authorized by an org-scoped
              token minted on the server from your session.
            </Callout.Text>
          </Callout.Root>
          <UsersWidget authToken={authToken} />
        </>
      ) : (
        <Callout.Root color="amber" variant="surface">
          <Callout.Icon>
            <LockClosedIcon />
          </Callout.Icon>
          <Callout.Text>
            Your role ({roleLabel(ctx.role)}) can&rsquo;t load this widget: it
            requires the <code>widgets:users-table:manage</code> permission,
            which only admins hold. The widget has no read-only mode, so a
            compliance viewer can&rsquo;t use it at all — whereas the custom{" "}
            <Link asChild>
              <NextLink href="/team">/team</NextLink>
            </Link>{" "}
            page gives them a read-only table.
            {tokenError ? <em> ({tokenError})</em> : null}
          </Callout.Text>
        </Callout.Root>
      )}
    </Flex>
  );
}
