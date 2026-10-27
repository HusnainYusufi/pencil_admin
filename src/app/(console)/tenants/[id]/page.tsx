import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { Badge, Card, DataList, EmptyState, PageHeader} from "@/components/ui/primitives";
import { requestNow } from "@/lib/time";
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
import { SubscriptionCell } from "@/components/tenant-cells";
import { groupFeatures, STATUS_LABEL } from "@/lib/feature-catalog";
import { FeatureSwitch, OverrideDialog, RemoveOverrideButton, StatusDialog, SubscriptionDialog } from "./tenant-dialogs";

export const metadata: Metadata = { title: "Tenant" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TenantPage({ params, searchParams }: PageProps<"/tenants/[id]">) {
  await requirePermission(Perm.TENANTS_READ);
  const now = requestNow();
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
          <Card title="Entitlements" description="Switch any feature on or off for this company. Changes apply immediately and are audited; Reset returns it to the plan." flush>
            {groupFeatures(features).map((group) => (
              <section key={group.id} aria-label={group.label}>
                <h3 className="border-b border-line bg-surface-2/60 px-5 py-2 text-[12.5px] font-semibold text-ink">{group.label}</h3>
                <ul className="hairline-grid">
                  {group.features.map((feature) => {
                    const value = tenant.entitlements[feature.key];
                    const override = overrides.get(feature.key);
                    const enabled = value?.enabled ?? false;
                    return (
                      <li key={feature.key} className="flex items-center gap-4 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className={enabled ? "font-medium text-ink" : "font-medium text-muted"}>{feature.name}</span>
                            {feature.status !== "AVAILABLE" && (
                              <Badge tone={STATUS_LABEL[feature.status].tone} dot={false}>
                                {STATUS_LABEL[feature.status].label}
                              </Badge>
                            )}
                            {override && (
                              <Badge tone="accent" dot={false}>
                                Override
                              </Badge>
                            )}
                          </p>
                          <p className="text-[12px] text-muted">
                            {override
                              ? `${override.reason ?? "Set by staff"}${override.expiresAt ? ` · until ${formatDate(override.expiresAt)}` : ""}`
                              : enabled
                                ? "From plan"
                                : "Not in plan"}
                            {feature.type === "LIMIT" && enabled && (
                              <span className="ml-2 font-mono text-ink-2">limit {value?.limit ?? "unlimited"}</span>
                            )}
                          </p>
                        </div>
                        {can(Perm.SUBSCRIPTIONS_MANAGE) ? (
                          <div className="flex shrink-0 items-center gap-1">
                            {override && <RemoveOverrideButton tenantId={tenant.id} featureKey={feature.key} />}
                            <OverrideDialog tenantId={tenant.id} feature={feature} current={override} />
                            <FeatureSwitch key={`${feature.key}:${enabled}`} tenantId={tenant.id} feature={feature} enabled={enabled} limit={value?.limit ?? null} />
                          </div>
                        ) : (
                          <Badge tone={enabled ? "success" : "neutral"}>{enabled ? "On" : "Off"}</Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
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
                  { label: "Status", value: <SubscriptionCell {...sub} now={now} /> },
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
