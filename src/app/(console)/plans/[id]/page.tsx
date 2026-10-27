import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { adminApi, requireAdmin, requirePermission } from "@/lib/dal";
import { hasPermission, Perm } from "@/lib/permissions";
import type { Feature, Plan } from "@/lib/types";
import { updatePlan } from "../actions";
import { PlanForm } from "../plan-form";

export const metadata: Metadata = { title: "Plan" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PlanPage({ params, searchParams }: PageProps<"/plans/[id]">) {
  await requirePermission(Perm.CATALOG_READ);
  const admin = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const saved = (await searchParams).saved === "1";

  const [plan, features] = await Promise.all([
    adminApi<Plan>(`/platform/plans/${id}`).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    adminApi<Feature[]>("/platform/features"),
  ]);
  const canManage = hasPermission(admin.permissions, Perm.CATALOG_MANAGE);

  return (
    <div className="space-y-8">
      {saved && (
        <p role="status" className="rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-[13.5px] text-success">
          Plan created.
        </p>
      )}
      <PageHeader
        eyebrow={
          <Link href="/plans" className="hover:text-ink">
            ← Plans
          </Link>
        }
        title={plan.name}
        description={<span className="font-mono text-[13px]">{plan.code}</span>}
      />
      <PlanForm action={updatePlan.bind(null, plan.id)} plan={plan} features={features} readOnly={!canManage} />
    </div>
  );
}
