import type { Metadata } from "next";
import { Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { Fragment } from "react";
import { adminApi, requireAdmin, requirePermission } from "@/lib/dal";
import { groupFeatures, STATUS_LABEL } from "@/lib/feature-catalog";
import { hasPermission, Perm } from "@/lib/permissions";
import type { Feature, Plan } from "@/lib/types";
import { NewFeatureDialog } from "./new-feature-dialog";

export const metadata: Metadata = { title: "Features" };

export default async function FeaturesPage() {
  await requirePermission(Perm.CATALOG_READ);
  const admin = await requireAdmin();
  const [features, plans] = await Promise.all([
    adminApi<Feature[]>("/platform/features"),
    adminApi<Plan[]>("/platform/plans", { query: { includeInactive: true } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${features.length} features`}
        title="Features"
        description="Every capability Pencil sells, by module. Switch them on per plan, or per company with an override."
        actions={hasPermission(admin.permissions, Perm.CATALOG_MANAGE) && <NewFeatureDialog />}
      />
      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>Feature</Th>
              <Th>Type</Th>
              <Th>Status</Th>
              <Th>Included in</Th>
            </tr>
          </thead>
          <tbody>
            {groupFeatures(features).map((group) => (
              <Fragment key={group.id}>
                <tr>
                  <th scope="colgroup" colSpan={4} className="border-b border-line bg-surface-2/60 px-4 pb-2 pt-5 text-left">
                    <span className="font-display text-[20px] font-normal text-ink">{group.label}</span>
                    <span className="ml-3 text-[12px] font-normal text-muted">{group.blurb}</span>
                  </th>
                </tr>
                {group.features.map((feature) => {
                  const inPlans = plans.filter((p) => p.features.some((f) => f.featureKey === feature.key && f.enabled));
                  return (
                    <tr key={feature.key}>
                      <Td>
                        <div className="font-medium">{feature.name}</div>
                        <div className="font-mono text-[11.5px] text-muted">{feature.key}</div>
                        {feature.description && <div className="mt-1 max-w-md text-[12.5px] text-ink-2">{feature.description}</div>}
                      </Td>
                      <Td>
                        <Badge tone={feature.type === "LIMIT" ? "info" : "neutral"} dot={false}>
                          {feature.type === "LIMIT" ? "Limit" : "On / off"}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge tone={STATUS_LABEL[feature.status].tone}>{STATUS_LABEL[feature.status].label}</Badge>
                      </Td>
                      <Td className="text-ink-2">{inPlans.length ? inPlans.map((p) => p.name).join(", ") : <span className="text-muted">No plan yet</span>}</Td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
