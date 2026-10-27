import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { Badge, Card, DataList, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { adminApi, requireAdmin, requirePermission } from "@/lib/dal";
import {
  COUNTRY_NAMES,
  formatDate,
  formatDateTime,
  subscriptionTone,
  tenantStatusTone,
  timeAgo,
  titleCase,
} from "@/lib/format";
import { hasPermission, Perm } from "@/lib/permissions";
import type { AuditLog, CursorPage, Feature, Plan, TenantDetail } from "@/lib/types";
import { OverrideDialog, RemoveOverrideButton, StatusDialog, SubscriptionDialog } from "./tenant-dialogs";

export const metadata: Metadata = { title: "Tenant" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TenantPage({ params, searchParams }: PageProps<"/tenants/[id]">) {
  await requirePermission(Perm.TENANTS_READ);
  const admin = await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const created = (await searchParams).created === "1";
  const can = (p: string) => hasPermission(admin.permissions, p);

  const tenant = await adminApi<TenantDetail>(`/platform/tenants/${id}`).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const [features, plans, activity] = await Promise.all([
    adminApi<Feature[]>("/platform/features"),
    can(Perm.SUBSCRIPTIONS_MANAGE) ? adminApi<Plan[]>("/platform/plans", { query: { includeInactive: true } }) : Promise.resolve([]),
    can(Perm.AUDIT_READ)
      ? adminApi<CursorPage<AuditLog>>("/platform/audit-logs", { query: { tenantId: id, limit: 12 } })
      : Promise.resolve(null),
  ]);
  const overrides = new Map(tenant.overrides.map((o) => [o.featureKey, o]));
  const sub = tenant.subscription;

  return (
    <div className="space-y-8">
      {created && (
        <p role="status" className="rounded-lg border border-success/30 bg-success-bg px-4 py-3 text-[13.5px] text-success">
          Company created with its chart of accounts, fiscal year and owner. Share the owner&apos;s temporary password securely.
        </p>
      )}

      <PageHeader
        eyebrow={
          <span className="flex items-center gap-3">
            <Link href="/tenants" className="hover:text-ink">
              ← Tenants
            </Link>
            <span className="normal-case tracking-normal">{tenant.slug}</span>
          </span>
        }
        title={tenant.legalName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={tenantStatusTone[tenant.status]}>{titleCase(tenant.status)}</Badge>
            {sub && <Badge tone={subscriptionTone[sub.status]}>{`${sub.plan.name} · ${titleCase(sub.status)}`}</Badge>}
            <span className="text-muted">
              {COUNTRY_NAMES[tenant.country]} · {tenant._count.memberships} member{tenant._count.memberships === 1 ? "" : "s"}
            </span>
          </span>
        }
        actions={
          <>
            {sub && can(Perm.SUBSCRIPTIONS_MANAGE) && <SubscriptionDialog tenantId={tenant.id} plans={plans} subscription={sub} />}
            {can(Perm.TENANTS_MANAGE) && tenant.status !== "ARCHIVED" && (
              <StatusDialog tenantId={tenant.id} status={tenant.status} name={tenant.legalName} />
            )}
          </>
        }
      />

      {tenant.status === "SUSPENDED" && (
        <div className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-[13.5px] text-danger">
          <strong className="font-semibold">Suspended {formatDate(tenant.suspendedAt)}.</strong> {tenant.suspensionReason}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card title="Entitlements" description="Effective access: plan values, with per-tenant overrides on top." flush>
            <Table>
              <thead>
                <tr>
                  <Th>Feature</Th>
                  <Th>Effective</Th>
                  <Th>Override</Th>
                  <Th align="right">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature) => {
                  const value = tenant.entitlements[feature.key];
                  const override = overrides.get(feature.key);
                  return (
                    <tr key={feature.key}>
                      <Td>
                        <div className="font-medium">{feature.name}</div>
                        <div className="font-mono text-[11.5px] text-muted">{feature.key}</div>
                      </Td>
                      <Td>
                        {!value?.enabled ? (
                          <span className="text-muted">Not included</span>
                        ) : feature.type === "LIMIT" ? (
                          <span className="font-mono tabular">{value.limit ?? "Unlimited"}</span>
                        ) : (
                          <Badge tone="success">Included</Badge>
                        )}
                      </Td>
                      <Td>
                        {override ? (
                          <span className="block">
                            <Badge tone="accent" dot={false}>
                              Override
                            </Badge>
                            <span className="mt-1 block text-[12px] text-muted">
                              {override.reason}
                              {override.expiresAt && ` · until ${formatDate(override.expiresAt)}`}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted">Plan</span>
                        )}
                      </Td>
                      <Td align="right">
                        {can(Perm.SUBSCRIPTIONS_MANAGE) && (
                          <div className="flex justify-end gap-1">
                            <OverrideDialog tenantId={tenant.id} feature={feature} current={override} />
                            {override && <RemoveOverrideButton tenantId={tenant.id} featureKey={feature.key} />}
                          </div>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>

          {activity && (
            <Card title="Activity" description="Most recent audited events for this company" flush actions={<Link href={`/audit?tenantId=${tenant.id}`} className="text-[13px] text-ink-2 underline-offset-4 hover:underline">Full log</Link>}>
              {activity.items.length === 0 ? (
                <EmptyState title="Quiet so far" />
              ) : (
                <ol className="hairline-grid px-5">
                  {activity.items.map((event) => (
                    <li key={event.id} className="flex items-baseline justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="font-mono text-[12.5px] text-ink">{event.action}</span>
                        <span className="ml-2 text-[12px] text-muted">
                          {event.actorType === "PLATFORM_ADMIN" ? "Pencil staff" : event.actorType === "USER" ? "Tenant user" : "System"}
                        </span>
                      </span>
                      <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)} className="shrink-0 text-[12px] text-muted">
                        {timeAgo(event.createdAt)}
                      </time>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Subscription">
            {sub ? (
              <DataList
                items={[
                  { label: "Plan", value: `${sub.plan.name} (${sub.plan.code})` },
                  { label: "Status", value: <Badge tone={subscriptionTone[sub.status]}>{titleCase(sub.status)}</Badge> },
                  { label: "Billing", value: titleCase(sub.billingInterval) },
                  { label: "Trial ends", value: formatDate(sub.trialEndsAt) },
                  { label: "Current period", value: `${formatDate(sub.currentPeriodStart)} – ${formatDate(sub.currentPeriodEnd)}` },
                ]}
              />
            ) : (
              <p className="text-muted">No subscription.</p>
            )}
          </Card>

          <Card title="Company">
            <DataList
              items={[
                { label: "Legal name", value: tenant.legalName },
                { label: "Trade name", value: tenant.tradeName },
                { label: "Country", value: COUNTRY_NAMES[tenant.country] },
                { label: "Currency", value: tenant.baseCurrency, mono: true },
                { label: "Time zone", value: tenant.timezone, mono: true },
                { label: "Tax number", value: tenant.taxNumber, mono: true },
                { label: "Commercial reg.", value: tenant.commercialRegistration, mono: true },
                { label: "Joined", value: formatDateTime(tenant.createdAt) },
                { label: "Tenant ID", value: tenant.id, mono: true },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
