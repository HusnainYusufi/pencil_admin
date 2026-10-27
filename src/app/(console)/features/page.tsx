import type { Metadata } from "next";
import { Badge, Card, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { adminApi, requireAdmin, requirePermission } from "@/lib/dal";
import { formatDate } from "@/lib/format";
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
        description="The entitlement keys the product checks in code. Grant them through plans or per-tenant overrides."
        actions={hasPermission(admin.permissions, Perm.CATALOG_MANAGE) && <NewFeatureDialog />}
      />
      <Card flush>
        <Table>
          <thead>
            <tr>
              <Th>Feature</Th>
              <Th>Type</Th>
              <Th>Included in</Th>
              <Th align="right">Added</Th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => {
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
                  <Td className="text-ink-2">{inPlans.length ? inPlans.map((p) => p.name).join(", ") : <span className="text-muted">No plan yet</span>}</Td>
                  <Td align="right" className="text-muted">
                    {formatDate(feature.createdAt)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
