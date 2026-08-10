import { Callout, Flex, Heading, Text } from "@radix-ui/themes";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

export default function NoOrganizationPage() {
  return (
    <Flex direction="column" align="center" gap="3" maxWidth="480px">
      <Heading size="7">No workspace selected</Heading>
      <Callout.Root color="amber" variant="surface">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>
          Your account isn&rsquo;t attached to a customer workspace, so there is
          nothing to show. In Meridian&rsquo;s product every user belongs to
          exactly one customer organization — contact your administrator to be
          added.
        </Callout.Text>
      </Callout.Root>
    </Flex>
  );
}
