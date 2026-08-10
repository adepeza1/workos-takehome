import NextLink from "next/link";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { Badge, Button, Callout, Flex, Heading, Text } from "@radix-ui/themes";
import { InfoCircledIcon, LockClosedIcon } from "@radix-ui/react-icons";
import { SignInButton } from "./components/sign-in-button";
import { getOrgPolicy } from "@/lib/org-context";
import { roleLabel, SSO_ORGS } from "@/lib/orgs";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { user, organizationId, role } = await withAuth();
  const { expired } = await searchParams;
  const policy = organizationId ? await getOrgPolicy(organizationId) : null;
  const acme = SSO_ORGS[0];

  return (
    <Flex direction="column" align="center" gap="3" maxWidth="560px">
      {expired && (
        <Callout.Root color="amber" variant="surface">
          <Callout.Icon>
            <LockClosedIcon />
          </Callout.Icon>
          <Callout.Text>
            Your session reached its time limit and was ended. Please sign in
            again.
          </Callout.Text>
        </Callout.Root>
      )}

      {user ? (
        <>
          <Heading size="8" align="center">
            Welcome back{user.firstName && `, ${user.firstName}`}
          </Heading>
          {policy && (
            <Flex align="center" gap="2" wrap="wrap" justify="center">
              <Badge size="2" color="iris" variant="soft">
                {policy.name}
              </Badge>
              <Badge size="2" color="gray" variant="soft">
                {roleLabel(role)}
              </Badge>
            </Flex>
          )}
          <Text size="4" color="gray" align="center">
            You&rsquo;re signed in to your workspace. Manage your people from the
            Team page.
          </Text>
          <Flex align="center" gap="3" mt="4">
            <Button asChild size="3">
              <NextLink href="/team">Go to Team</NextLink>
            </Button>
            <Button asChild size="3" variant="soft">
              <NextLink href="/account">View account</NextLink>
            </Button>
          </Flex>
        </>
      ) : (
        <>
          <Heading size="8" align="center">
            Meridian Analytics
          </Heading>
          <Text size="4" color="gray" align="center" mb="2">
            Your company&rsquo;s private analytics workspace. Sign in to manage
            your team.
          </Text>
          <Flex align="center" gap="3">
            <SignInButton large />
            {acme && (
              <Button asChild size="3" variant="soft">
                <NextLink href={`/login?organizationId=${acme.id}`}>
                  Sign in with {acme.name} SSO
                </NextLink>
              </Button>
            )}
          </Flex>
          <Callout.Root variant="surface" color="gray" mt="4">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              {acme?.name} employees sign in through their own identity provider
              (Okta). Other roles can use email &amp; password.
            </Callout.Text>
          </Callout.Root>
        </>
      )}
    </Flex>
  );
}
