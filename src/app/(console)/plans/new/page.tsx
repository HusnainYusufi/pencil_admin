import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { adminApi, requirePermission } from "@/lib/dal";
import { Perm } from "@/lib/permissions";
import type { Feature } from "@/lib/types";
import { createPlan } from "../actions";
import { PlanForm } from "../plan-form";

export const metadata: Metadata = { title: "New plan" };

export default async function NewPlanPage() {
  await requirePermission(Perm.CATALOG_MANAGE);
  const features = await adminApi<Feature[]>("/platform/features");
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <Link href="/plans" className="hover:text-ink">
            ← Plans
          </Link>
        }
        title="New plan"
      />
      <PlanForm action={createPlan} features={features} />
    </div>
  );
}
