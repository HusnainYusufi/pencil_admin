import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { adminApi, requireAdmin, requirePermission } from "@/lib/dal";
import { groupFeatures, STATUS_LABEL } from "@/lib/feature-catalog";
import { formatMoney } from "@/lib/format";
import { hasPermission, Perm } from "@/lib/permissions";
import type { Feature, Plan } from "@/lib/types";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  await requirePermission(Perm.CATALOG_READ);
  const admin = await requireAdmin();
  const [plans, features] = await Promise.all([
    adminApi<Plan[]>("/platform/plans", { query: { includeInactive: true } }),
    adminApi<Feature[]>("/platform/features"),
  ]);
  const canManage = hasPermission(admin.permissions, Perm.CATALOG_MANAGE);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${plans.length} plans · ${features.length} features`}
        title="Plans"
        description="What each tier sells. Changes apply to every tenant on the plan immediately."
        actions={canManage && <ButtonLink href="/plans/new">New plan</ButtonLink>}
      />

      {plans.length === 0 ? (
        <Card>
          <EmptyState title="No plans" />
        </Card>
      ) : (
        <Card flush>
          {/* The plan matrix: features down, plans across, the whole offer readable in one glance. */}
          <Table>
            <thead>
              <tr>
                <Th className="w-[28%]">Feature</Th>
                {plans.map((plan) => (
                  <Th key={plan.id} plain className="min-w-[180px] align-top">
                    <div className="flex items-center gap-2">
                      <Link href={`/plans/${plan.id}`} className="font-display text-[22px] text-ink hover:underline hover:underline-offset-4">
                        {plan.name}
                      </Link>
                      {!plan.isActive && <Badge dot={false}>Inactive</Badge>}
                      {plan.isActive && !plan.isPublic && <Badge tone="info" dot={false}>Private</Badge>}
                    </div>
                    <div className="mt-1 space-y-0.5 font-mono text-[11.5px] font-normal text-ink-2">
                      {plan.prices
                        .filter((p) => p.interval === "MONTHLY")
                        .map((p) => (
                          <div key={p.id}>{formatMoney(p.amount, p.currency)} / mo</div>
                        ))}
                      <div className="text-muted">{plan.trialDays > 0 ? `${plan.trialDays}-day trial` : "no trial"}</div>
                    </div>
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupFeatures(features).map((group) => (
                <Fragment key={group.id}>
                  <tr>
                    <th scope="colgroup" colSpan={plans.length + 1} className="border-b border-line bg-surface-2/60 px-4 pb-2 pt-5 text-left">
                      <span className="font-display text-[20px] font-normal text-ink">{group.label}</span>
                      <span className="ml-3 text-[12px] font-normal text-muted">{group.blurb}</span>
                    </th>
                  </tr>
                  {group.features.map((feature) => (
                    <tr key={feature.key} className="transition-colors duration-150 hover:bg-surface-2/50">
                      <Td>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{feature.name}</span>
                          {feature.status !== "AVAILABLE" && (
                            <Badge tone={STATUS_LABEL[feature.status].tone} dot={false}>
                              {STATUS_LABEL[feature.status].label}
                            </Badge>
                          )}
                        </span>
                        <span className="font-mono text-[11.5px] text-muted">{feature.key}</span>
                      </Td>
                      {plans.map((plan) => {
                        const grant = plan.features.find((f) => f.featureKey === feature.key);
                        return (
                          <Td key={plan.id}>
                            {!grant?.enabled ? (
                              <Minus className="size-4 text-line-strong" aria-label="Not included" />
                            ) : feature.type === "LIMIT" ? (
                              <span className="font-mono tabular">{grant.limitValue ?? "Unlimited"}</span>
                            ) : (
                              <Check className="size-4 text-success" aria-label="Included" />
                            )}
                          </Td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}
