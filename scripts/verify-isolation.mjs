// Verifies the tenant-isolation guarantees against live WorkOS data:
//   1. Listing memberships scoped to an org returns ONLY that org's members.
//   2. A membership id from one org resolves to that org — so the app's
//      assertMembershipInOrg() guard correctly rejects cross-tenant writes.
//   3. Per-org policy metadata differs between tenants.
//
//   node scripts/verify-isolation.mjs

import { readFileSync } from "node:fs";
import { WorkOS } from "@workos-inc/node";

if (!process.env.WORKOS_API_KEY) {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const workos = new WorkOS(process.env.WORKOS_API_KEY);
const ACME = "org_01KZEN19E68J1TKC80KVNZH724";
const POTTER = "org_01KZENWC1J7FC0JYXGW8PTHZ3Y";

let failures = 0;
function check(label, cond) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}`);
  if (!cond) failures++;
}

async function membersOf(orgId) {
  const m = await workos.userManagement.listOrganizationMemberships({
    organizationId: orgId,
    limit: 100,
  });
  return m.data;
}

const acme = await membersOf(ACME);
const potter = await membersOf(POTTER);

console.log(
  `\nAcme members (${acme.length}):`,
  acme.map((m) => `${m.userId}=${m.role?.slug}`).join(", "),
);
console.log(
  `Potter members (${potter.length}):`,
  potter.map((m) => `${m.userId}=${m.role?.slug}`).join(", "),
);
console.log("");

// 1. Every returned membership belongs to the requested org.
check(
  "listOrganizationMemberships(Acme) returns only Acme memberships",
  acme.every((m) => m.organizationId === ACME),
);
check(
  "listOrganizationMemberships(Potter) returns only Potter memberships",
  potter.every((m) => m.organizationId === POTTER),
);

// 2. No user id appears in both tenants (disjoint membership sets).
const acmeUsers = new Set(acme.map((m) => m.userId));
const overlap = potter.filter((m) => acmeUsers.has(m.userId));
check("Acme and Potter membership sets are disjoint", overlap.length === 0);

// 3. Cross-tenant guard: a Potter membership id resolves to Potter, so
//    assertMembershipInOrg(nwMembership, ACME) would throw in the app.
const nwMembership = await workos.userManagement.getOrganizationMembership(
  potter[0].id,
);
check(
  "getOrganizationMembership(Potter id).organizationId === Potter",
  nwMembership.organizationId === POTTER,
);
check(
  "=> guard would reject that membership id under Acme's context",
  nwMembership.organizationId !== ACME,
);

// 4. Per-org policy differs.
const acmeOrg = await workos.organizations.getOrganization(ACME);
const nwOrg = await workos.organizations.getOrganization(POTTER);
console.log("\nAcme metadata:", acmeOrg.metadata);
console.log("Potter metadata:", nwOrg.metadata);
check(
  "Potter session ceiling (24h) is stricter than Acme's",
  Number(nwOrg.metadata?.maxSessionHours) <
    Number(acmeOrg.metadata?.maxSessionHours),
);

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
