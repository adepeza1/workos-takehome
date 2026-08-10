// Probes the authentication posture of each tenant via the SDK — no browser.
// Proves the policies fire at sign-in time:
//   - Acme is Okta-only: password auth for @acme.com users is refused with
//     sso_required (req #4 — every Acme employee signs in through Okta).
//   - Potter enforces MFA: its admin (Fred) cannot get a plain-password
//     session; auth stops at an MFA challenge/enrollment (req #5 — admin MFA).
//
//   node scripts/verify-auth.mjs
//   FRED_PASSWORD=... node scripts/verify-auth.mjs   # also checks Fred/Potter

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
const clientId = process.env.WORKOS_CLIENT_ID;
const ACME_PASSWORD = "MeridianDemo!2026";
const FRED_PASSWORD = process.env.FRED_PASSWORD;

let failures = 0;
function check(label, cond, detail = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

async function attempt(email, password) {
  try {
    const res = await workos.userManagement.authenticateWithPassword({
      clientId,
      email,
      password,
    });
    return { ok: true, organizationId: res.organizationId };
  } catch (e) {
    const msg = e?.message ?? String(e);
    const code =
      e?.code ?? e?.rawData?.code ?? (/sso_required/.test(msg) ? "sso_required" : undefined);
    return { ok: false, code, message: msg };
  }
}

console.log("Probing authentication posture...\n");

for (const email of ["lead@acme.com", "compliance@acme.com"]) {
  const r = await attempt(email, ACME_PASSWORD);
  console.log(`${email}: ${JSON.stringify(r)}`);
  check(
    `${email} is forced through Okta/SSO (password refused)`,
    !r.ok && r.code === "sso_required",
    r.ok ? "got a password session!" : r.code,
  );
}

if (FRED_PASSWORD) {
  const fred = await attempt("adepeza1+potter@gmail.com", FRED_PASSWORD);
  console.log(`adepeza1+potter@gmail.com: ${JSON.stringify(fred)}`);
  check(
    "Fred (Potter admin) cannot get a plain-password session — MFA enforced",
    !fred.ok && (fred.code === "mfa_challenge" || fred.code === "mfa_enrollment"),
    fred.ok ? "got a session without MFA!" : fred.code,
  );
} else {
  console.log(
    "adepeza1+potter@gmail.com: SKIPPED (set FRED_PASSWORD to include this check)",
  );
}

console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
