"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/actions";
import { ApiError, apiRequest } from "@/lib/api";
import { clientContext, getSession } from "@/lib/dal";
import {
  SESSION_COOKIE,
  expiredCookieOptions,
  sealSession,
  sessionCookieOptions,
  type AdminProfile,
  type AdminSession,
} from "@/lib/session";

const credentials = z.object({
  email: z.email({ message: "Enter a valid email address" }).max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

/** Only same-site relative paths: blocks open redirects like `//evil.com`. */
function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, fieldErrors };
  }

  const client = await clientContext();
  let session: AdminSession;
  try {
    const now = Date.now();
    const tokens = await apiRequest<LoginResponse>("/platform/auth/login", {
      method: "POST",
      body: parsed.data,
      client,
    });
    const admin = await apiRequest<AdminProfile>("/platform/auth/me", { token: tokens.accessToken, client });
    session = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessExpiresAt: now + tokens.expiresIn * 1000,
      refreshExpiresAt: Date.parse(tokens.refreshTokenExpiresAt),
      lastActiveAt: now,
      admin,
    };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const messages: Record<string, string> = {
      INVALID_CREDENTIALS: "Email or password is incorrect.",
      ACCOUNT_LOCKED: "Too many failed attempts. This account is temporarily locked.",
      ACCOUNT_DISABLED: "This account is disabled. Contact a super admin.",
      RATE_LIMITED: "Too many attempts. Wait a minute and try again.",
      SERVICE_UNAVAILABLE: "The Pencil API is unreachable. Try again shortly.",
    };
    return { ok: false, error: messages[error.code] ?? "Sign-in failed. Try again." };
  }

  (await cookies()).set(SESSION_COOKIE, await sealSession(session), sessionCookieOptions(session));
  redirect(safeNext(form.get("next")));
}

export async function logout(): Promise<void> {
  const session = await getSession();
  if (session) {
    // Revoke server-side too, so a copied cookie is useless afterwards.
    await apiRequest("/platform/auth/logout", {
      method: "POST",
      token: session.accessToken,
      client: await clientContext(),
    }).catch(() => undefined);
  }
  // A __Host- cookie is only removed by a Set-Cookie with the same Secure/Path
  // attributes; a bare delete() would be ignored by the browser.
  (await cookies()).set(SESSION_COOKIE, "", { ...expiredCookieOptions(), expires: new Date(0) });
  redirect("/login?reason=signed-out");
}
