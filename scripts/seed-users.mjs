// Reproducible seed for the Meridian demo test users.
//
// Sets known passwords on the pre-created Acme role users and creates the
// strict-policy prospect (Northwind) admin. Idempotent-ish: safe to re-run;
// createUser will 422 if the user already exists (caught and reported).
//
//   node scripts/seed-users.mjs
//
// Reads WORKOS_API_KEY from the environment or .env.local. No secrets are
// hardcoded here; the demo password below is intentionally shared so reviewers
// can log in (see SUBMISSION.md).

import { readFileSync } from "node:fs";
import { WorkOS } from "@workos-inc/node";

function loadEnv() {
  if (process.env.WORKOS_API_KEY) return;
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* ignore */
  }
}

loadEnv();

const workos = new WorkOS(process.env.WORKOS_API_KEY);

const DEMO_PASSWORD = "MeridianDemo!2026";
const ACME = "org_01KZEN19E68J1TKC80KVNZH724";
const NORTHWIND = "org_01KZENVGXPM7TF10A9TTPWTNVK";

// Pre-created Acme role users (roles already assigned in the dashboard).
const ACME_PASSWORD_USERS = [
  { id: "user_01KZNNPW7J945WRDD6GRHJYNX1", email: "lead@acme.com" },
  { id: "user_01KZNNR2XCTR8MF4DEMBV2Q780", email: "compliance@acme.com" },
];

async function setPassword(user) {
  await workos.userManagement.updateUser({
    userId: user.id,
    password: DEMO_PASSWORD,
    emailVerified: true,
  });
  console.log(`  set password + verified: ${user.email}`);
}

async function ensureNorthwindAdmin() {
  const email = "admin@northwind.com";
  let user;
  const existing = await workos.userManagement.listUsers({ email });
  if (existing.data.length > 0) {
    user = existing.data[0];
    await workos.userManagement.updateUser({
      userId: user.id,
      password: DEMO_PASSWORD,
      emailVerified: true,
    });
    console.log(`  updated existing Northwind admin: ${email}`);
  } else {
    user = await workos.userManagement.createUser({
      email,
      password: DEMO_PASSWORD,
      firstName: "Nadia",
      lastName: "Admin",
      emailVerified: true,
    });
    console.log(`  created Northwind admin: ${email} (${user.id})`);
  }

  const memberships = await workos.userManagement.listOrganizationMemberships({
    userId: user.id,
    organizationId: NORTHWIND,
  });
  if (memberships.data.length === 0) {
    await workos.userManagement.createOrganizationMembership({
      userId: user.id,
      organizationId: NORTHWIND,
      roleSlug: "admin",
    });
    console.log(`  added ${email} to Northwind as admin`);
  } else {
    console.log(`  ${email} already a member of Northwind`);
  }
}

console.log("Seeding Acme password users...");
for (const u of ACME_PASSWORD_USERS) {
  try {
    await setPassword(u);
  } catch (e) {
    console.error(`  FAILED ${u.email}:`, e?.message ?? e);
  }
}

console.log("Seeding Northwind admin...");
try {
  await ensureNorthwindAdmin();
} catch (e) {
  console.error("  FAILED northwind admin:", e?.message ?? e);
}

console.log("Done.");
console.log(`Demo password for all password logins: ${DEMO_PASSWORD}`);
console.log(`(Acme admin uses SSO via the Test IdP — no password.)`);
void ACME;
