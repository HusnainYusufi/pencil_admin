"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertUuid, optional, str, toActionError, type ActionState } from "@/lib/actions";
import { adminApi, requirePermission } from "@/lib/dal";
import { Perm } from "@/lib/permissions";
import type { Tenant } from "@/lib/types";

/**
 * Every action re-authorizes (requirePermission) and validates its input:
 * Server Actions are public HTTP endpoints. The API enforces the same rules
 * again: the console is never the only line of defence.
 */

const IDEMPOTENCY_KEY = /^[A-Za-z0-9_\-:.]{8,255}$/;

export async function onboardTenant(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePermission(Perm.TENANTS_MANAGE);
  const idempotencyKey = str(form, "idempotencyKey");
  if (!IDEMPOTENCY_KEY.test(idempotencyKey)) return { ok: false, error: "Reload the page and try again." };

  let tenant: Tenant;
  try {
    tenant = await adminApi<Tenant>("/platform/tenants", {
      method: "POST",
      idempotencyKey,
      body: {
        company: {
          legalName: str(form, "company.legalName"),
          tradeName: optional(form, "company.tradeName"),
          country: str(form, "company.country"),
          taxNumber: optional(form, "company.taxNumber"),
          commercialRegistration: optional(form, "company.commercialRegistration"),
          locale: optional(form, "company.locale"),
        },
        owner: {
          fullName: str(form, "owner.fullName"),
          email: str(form, "owner.email"),
          password: optional(form, "owner.password"),
        },
        planCode: optional(form, "planCode"),
      },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/tenants");
  redirect(`/tenants/${tenant.id}?created=1`);
}

export async function setTenantStatus(tenantId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePermission(Perm.TENANTS_MANAGE);
  const status = str(form, "status");
  if (!["ACTIVE", "SUSPENDED", "ARCHIVED"].includes(status)) return { ok: false, error: "Choose a valid status." };
  try {
    await adminApi(`/platform/tenants/${assertUuid(tenantId)}/status`, {
      method: "PATCH",
      body: { status, reason: optional(form, "reason") },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(`/tenants/${tenantId}`);
  return { ok: true, message: status === "ACTIVE" ? "Tenant reactivated." : `Tenant ${status.toLowerCase()}.` };
}

export async function changeSubscription(tenantId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePermission(Perm.SUBSCRIPTIONS_MANAGE);
  try {
    await adminApi(`/platform/tenants/${assertUuid(tenantId)}/subscription`, {
      method: "PUT",
      body: {
        planCode: str(form, "planCode"),
        status: optional(form, "status"),
        billingInterval: optional(form, "billingInterval"),
      },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(`/tenants/${tenantId}`);
  return { ok: true, message: "Subscription updated." };
}

export async function setFeatureOverride(tenantId: string, featureKey: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePermission(Perm.SUBSCRIPTIONS_MANAGE);
  if (!/^[a-z][a-z0-9_.]{0,99}$/.test(featureKey)) return { ok: false, error: "Invalid feature." };
  const limitRaw = str(form, "limitValue");
  const expires = str(form, "expiresAt");
  try {
    await adminApi(`/platform/tenants/${assertUuid(tenantId)}/features/${featureKey}`, {
      method: "PUT",
      body: {
        enabled: form.get("enabled") === "on",
        limitValue: limitRaw === "" ? null : Number(limitRaw),
        reason: optional(form, "reason"),
        expiresAt: expires ? new Date(`${expires}T23:59:59Z`).toISOString() : undefined,
      },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath(`/tenants/${tenantId}`);
  return { ok: true, message: "Override saved." };
}

export async function removeFeatureOverride(tenantId: string, featureKey: string): Promise<void> {
  await requirePermission(Perm.SUBSCRIPTIONS_MANAGE);
  if (!/^[a-z][a-z0-9_.]{0,99}$/.test(featureKey)) return;
  await adminApi(`/platform/tenants/${assertUuid(tenantId)}/features/${featureKey}`, { method: "DELETE" });
  revalidatePath(`/tenants/${tenantId}`);
}
