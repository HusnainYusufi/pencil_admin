import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ApiError, apiRequest, type ApiRequest } from "./api";
import { hasPermission } from "./permissions";
import { SESSION_COOKIE, unsealSession, type AdminProfile, type AdminSession } from "./session";

/**
 * Data Access Layer: the only path from UI code to the API. Every read and
 * every Server Action re-verifies the session here (never trust the client).
 * The proxy keeps tokens fresh, so this never has to write cookies.
 */
export const getSession = cache(async (): Promise<AdminSession | null> => {
  return unsealSession((await cookies()).get(SESSION_COOKIE)?.value);
});

export async function requireAdmin(): Promise<AdminProfile> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session.admin;
}

/** Pages and actions alike: lacking the permission lands on the 403 page. */
export async function requirePermission(permission: string): Promise<AdminProfile> {
  const admin = await requireAdmin();
  if (!hasPermission(admin.permissions, permission)) redirect("/forbidden");
  return admin;
}

export async function clientContext(): Promise<ApiRequest["client"]> {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

/** Authenticated API call as the signed-in admin. */
export async function adminApi<T>(path: string, req: Omit<ApiRequest, "token" | "client"> = {}): Promise<T> {
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    return await apiRequest<T>(path, { ...req, token: session.accessToken, client: await clientContext() });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login?reason=expired");
    throw error;
  }
}
