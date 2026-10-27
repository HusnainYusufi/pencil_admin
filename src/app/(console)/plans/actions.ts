"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertUuid, optional, str, toActionError, type ActionState } from "@/lib/actions";
import { adminApi, requirePermission } from "@/lib/dal";
import { Perm } from "@/lib/permissions";
import type { Feature, Plan } from "@/lib/types";

const CURRENCIES = ["SAR", "JOD"] as const;
const INTERVALS = ["MONTHLY", "YEARLY"] as const;

/** Reads the plan editor's feature rows: `feature:<key>` checkbox + `limit:<key>`. */
function readFeatures(form: FormData, features: Feature[]) {
  return features
    .filter((f) => form.get(`feature:${f.key}`) === "on")
    .map((f) => {
      const limit = str(form, `limit:${f.key}`);
      return { featureKey: f.key, enabled: true, limitValue: f.type === "LIMIT" && limit !== "" ? Number(limit) : null };
    });
}

function readPrices(form: FormData) {
  return CURRENCIES.flatMap((currency) =>
    INTERVALS.flatMap((interval) => {
      const amount = str(form, `price:${currency}:${interval}`);
      return amount ? [{ currency, interval, amount }] : [];
    }),
  );
}

function readDetails(form: FormData) {
  return {
    name: str(form, "name"),
    description: optional(form, "description"),
    trialDays: Number(str(form, "trialDays") || 0),
    sortOrder: Number(str(form, "sortOrder") || 0),
    isPublic: form.get("isPublic") === "on",
    isActive: form.get("isActive") === "on",
  };
}

export async function createPlan(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePermission(Perm.CATALOG_MANAGE);
  const features = await adminApi<Feature[]>("/platform/features");
  let plan: Plan;
  try {
    plan = await adminApi<Plan>("/platform/plans", {
      method: "POST",
      body: { code: str(form, "code"), ...readDetails(form), features: readFeatures(form, features), prices: readPrices(form) },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/plans");
  redirect(`/plans/${plan.id}?saved=1`);
}

export async function updatePlan(planId: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePermission(Perm.CATALOG_MANAGE);
  const id = assertUuid(planId);
  const features = await adminApi<Feature[]>("/platform/features");
  try {
    await adminApi(`/platform/plans/${id}`, { method: "PATCH", body: readDetails(form) });
    await adminApi(`/platform/plans/${id}/features`, { method: "PUT", body: { features: readFeatures(form, features) } });
    await adminApi(`/platform/plans/${id}/prices`, { method: "PUT", body: { prices: readPrices(form) } });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/plans");
  revalidatePath(`/plans/${id}`);
  return { ok: true, message: "Plan saved. Entitlements of tenants on this plan are updated." };
}

export async function createFeature(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requirePermission(Perm.CATALOG_MANAGE);
  try {
    await adminApi("/platform/features", {
      method: "POST",
      body: {
        key: str(form, "key"),
        name: str(form, "name"),
        description: optional(form, "description"),
        type: str(form, "type"),
        module: optional(form, "module"),
        status: optional(form, "status"),
      },
    });
  } catch (error) {
    return toActionError(error);
  }
  revalidatePath("/features");
  return { ok: true, message: "Feature created." };
}
