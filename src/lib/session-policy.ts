/**
 * Per-organization session ceiling ("24h sessions for one customer, no
 * exceptions") enforced in the app layer.
 *
 * WorkOS enforces MFA per organization natively, but session *length* is only
 * an environment-wide setting — there is no per-org override in the control
 * plane. So we enforce the ceiling ourselves: at sign-in we stamp a signed,
 * httpOnly cookie with the authentication time and the org's window; every
 * protected surface checks it via requireOrgContext(). See SUBMISSION.md.
 *
 * The stamp is HMAC-signed with WORKOS_COOKIE_PASSWORD so a user cannot extend
 * their own session by editing the cookie. It is set once at the callback and
 * never touched on token refresh, so it reflects the *original* sign-in time.
 *
 * The window is stored as an integer number of seconds. (An earlier version
 * stored fractional hours, whose decimal point collided with the "." field
 * delimiter and parsed the window as 0 — expiring every session instantly.)
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_POLICY_COOKIE = "meridian_session_policy";

interface SessionPolicy {
  authAtMs: number;
  /** Session window in whole seconds (integer — never fractional). */
  maxSeconds: number;
}

function secret(): string {
  const value = process.env.WORKOS_COOKIE_PASSWORD;
  if (!value) throw new Error("WORKOS_COOKIE_PASSWORD is not set");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Serialize a policy stamp into a signed cookie value. */
export function encodeSessionPolicy(policy: SessionPolicy): string {
  // Both fields are integers, so "." is a safe delimiter.
  const payload = `${Math.trunc(policy.authAtMs)}.${Math.trunc(policy.maxSeconds)}`;
  return `${payload}.${sign(payload)}`;
}

/** Parse and verify a cookie value; returns null if missing or tampered. */
export function decodeSessionPolicy(
  value: string | undefined,
): SessionPolicy | null {
  if (!value) return null;
  const lastDot = value.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = value.slice(0, lastDot);
  const mac = value.slice(lastDot + 1);
  const expected = sign(payload);
  const macBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expected);
  if (macBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(macBuf, expectedBuf)) return null;
  const [authAt, maxSeconds] = payload.split(".");
  const authAtMs = Number(authAt);
  const seconds = Number(maxSeconds);
  if (!Number.isFinite(authAtMs) || !Number.isFinite(seconds)) return null;
  return { authAtMs, maxSeconds: seconds };
}

export interface SessionAge {
  maxSeconds: number;
  expiresAtMs: number;
  expired: boolean;
  remainingMs: number;
}

/** Evaluate a policy stamp against the current time. */
export function evaluateSessionPolicy(
  value: string | undefined,
  now: number,
): SessionAge | null {
  const policy = decodeSessionPolicy(value);
  if (!policy) return null;
  const expiresAtMs = policy.authAtMs + policy.maxSeconds * 1000;
  return {
    maxSeconds: policy.maxSeconds,
    expiresAtMs,
    expired: now >= expiresAtMs,
    remainingMs: Math.max(0, expiresAtMs - now),
  };
}
