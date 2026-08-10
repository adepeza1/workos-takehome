// Reproducible seed for the Acme password test users.
//
// Sets known passwords on the pre-created Acme role users so reviewers can sign
// in. (Acme actually enforces SSO for its @acme.com domain, so these passwords
// are a convenience fallback; the intended path is "Sign in with Acme SSO".)
//
// The strict-policy prospect's admin (Fred, adepeza1+potter@gmail.com in the
// Potter org) is created by hand with a real inbox so MFA enrollment works for
// a live demo — it is intentionally not seeded here.
//
//   node scripts/seed-users.mjs
//
// Reads WORKOS_API_KEY from the environment or .env.local. No secrets are
// hardcoded; the demo password below is intentionally shared (see SUBMISSION.md).

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

console.log("Seeding Acme password users...");
for (const u of ACME_PASSWORD_USERS) {
  try {
    await setPassword(u);
  } catch (e) {
    console.error(`  FAILED ${u.email}:`, e?.message ?? e);
  }
}

console.log("Done.");
console.log(`Demo password for Acme fallback logins: ${DEMO_PASSWORD}`);
console.log("(Acme admin uses SSO via the Test IdP; Potter's Fred uses his own password + MFA.)");
