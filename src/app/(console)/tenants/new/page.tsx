import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import { adminApi, requirePermission } from "@/lib/dal";
import { Perm } from "@/lib/permissions";
import type { Plan } from "@/lib/types";
import { OnboardForm } from "./onboard-form";

export const metadata: Metadata = { title: "Onboard tenant" };

export default async function OnboardTenantPage() {
  await requirePermission(Perm.TENANTS_MANAGE);
  const plans = await adminApi<Plan[]>("/platform/plans");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={
          <Link href="/tenants" className="hover:text-ink">
            ← Tenants
          </Link>
        }
        title="Onboard a tenant"
        description="Creates the company, its owner, the country chart of accounts and the subscription in one step."
      />
      {/* One key per form render: a retried or double-clicked submit can never create two companies. */}
      <OnboardForm plans={plans.filter((p) => p.isActive)} idempotencyKey={`onboard-${randomUUID()}`} />
    </div>
  );
}
