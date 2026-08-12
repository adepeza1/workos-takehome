import { Card, Grid, Heading, Text } from "@radix-ui/themes";

export function Footer() {
  return (
    <Grid columns={{ initial: "1", sm: "3" }} gap={{ initial: "2", sm: "3" }}>
      <Card size="1" asChild variant="classic">
        <a href="https://workos.com/docs" rel="noreferrer" target="_blank">
          <Heading size="2" mb="1">
            Documentation
          </Heading>
          <Text color="gray" size="1">
            View integration guides and SDK documentation.
          </Text>
        </a>
      </Card>
      <Card size="1" asChild variant="classic">
        <a
          href="https://workos.com/docs/reference"
          rel="noreferrer"
          target="_blank"
        >
          <Heading size="2" mb="1">
            API Reference
          </Heading>
          <Text color="gray" size="1">
            Every WorkOS API method and endpoint documented.
          </Text>
        </a>
      </Card>
      <Card size="1" asChild variant="classic">
        <a href="https://workos.com" rel="noreferrer" target="_blank">
          <Heading size="2" mb="1">
            WorkOS
          </Heading>
          <Text color="gray" size="1">Learn more about other WorkOS products.</Text>
        </a>
      </Card>
    </Grid>
  );
}
