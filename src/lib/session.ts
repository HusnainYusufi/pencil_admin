import "server-only";
import { sealData, unsealData } from "iron-session";
import { env } from "./env";

export interface AdminProfile {
  id: string;
  email: string;
  fullName: string;
  role: "SUPER_ADMIN" | "OPERATIONS" | "SUPPORT" | "BILLING";
  permissions: string[];
}

/**
 * Lives only in an encrypted (AES-256-GCM via iron-session), httpOnly,
 * SameSite=Strict cookie. The browser can neither read nor forge it; API
 * tokens never reach client JavaScript.
 */
export interface AdminSession {
  accessToken: string;
  refreshToken: string;
  /** epoch ms */
  accessExpiresAt: number;
  /** epoch ms; absolute end of the staff session (no sliding past it). */
  refreshExpiresAt: number;
  /** epoch ms; drives the idle timeout. */
  lastActiveAt: number;
  admin: AdminProfile;
}

/** `__Host-` prefix: Secure, Path=/, no Domain, so subdomains can't plant or read it. */
export const SESSION_COOKIE = env.cookieSecure ? "__Host-pencil_admin" : "pencil_admin";

const MAX_TTL_SECONDS = 24 * 3600;

export function sealSession(session: AdminSession): Promise<string> {
  return sealData(session, { password: env.sessionSecret, ttl: MAX_TTL_SECONDS });
}

export async function unsealSession(value: string | undefined): Promise<AdminSession | null> {
  if (!value) return null;
  try {
    const session = await unsealData<AdminSession>(value, { password: env.sessionSecret, ttl: MAX_TTL_SECONDS });
    return session && typeof session.accessToken === "string" ? session : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(session: AdminSession) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "strict" as const,
    path: "/",
    expires: new Date(session.refreshExpiresAt),
  };
}

/** Attributes for clearing the cookie: must match those it was set with. */
export function expiredCookieOptions() {
  return { httpOnly: true, secure: env.cookieSecure, sameSite: "strict" as const, path: "/", expires: new Date(0) };
}

export type SessionEndReason = "idle" | "expired" | "signed-out";

/** Validates the session's time limits; null when it must end. */
export function checkSessionLimits(session: AdminSession, now = Date.now()): SessionEndReason | null {
  if (now >= session.refreshExpiresAt) return "expired";
  if (now - session.lastActiveAt > env.idleTimeoutMs) return "idle";
  return null;
}
