import type { Metadata } from "next";
import Link from "next/link";
import { BarList, Sparkline } from "@/components/ui/charts";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { adminApi, requirePermission } from "@/lib/dal";
import { COUNTRY_NAMES, formatDate, subscriptionTone, tenantStatusTone, timeAgo, titleCase } from "@/lib/format";
import { Perm } from "@/lib/permissions";
import type { PlatformStats } from "@/lib/types";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  await requirePermission(Perm.TENANTS_READ);
  const stats = await adminApi<PlatformStats>("/platform/stats");

  const byStatus = Object.fromEntries(stats.tenants.byStatus.map((s) => [s.status, s.count]));
  const bySub = Object.fromEntries(stats.subscriptions.map((s) => [s.status, s.count]));
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date());

  const kpis = [
    { label: "Tenants", value: stats.tenants.total, note: "all companies" },
    { label: "Active", value: byStatus.ACTIVE ?? 0, note: "can sign in" },
    { label: "On trial", value: bySub.TRIALING ?? 0, note: "subscriptions" },
    { label: "Past due", value: bySub.PAST_DUE ?? 0, note: "needs follow-up", attention: (bySub.PAST_DUE ?? 0) > 0 },
    { label: "Suspended", value: byStatus.SUSPENDED ?? 0, note: "locked out", attention: (byStatus.SUSPENDED ?? 0) > 0 },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={today}
        title="Overview"
        description="The health of every company on Pencil, at a glance."
        actions={<ButtonLink href="/tenants/new">Onboard tenant</ButtonLink>}
      />

      {/* KPI ledger: one row, hairline separated, mono figures. */}
      <section aria-label="Key figures" className="grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface shadow-card sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="border-b border-r border-line px-5 py-4 last:border-r-0 lg:border-b-0">
            <p className="text-[12.5px] text-muted">{kpi.label}</p>
            <p className="mt-1 font-mono text-[30px] font-medium leading-none tabular">
              <span className={kpi.attention ? "mark" : undefined}>{kpi.value}</span>
            </p>
            <p className="mt-2 text-[12px] text-muted">{kpi.note}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card title="New companies" description="Sign-ups and onboardings, last 30 days">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="font-mono text-[44px] font-medium leading-none tabular">{stats.signups.last30Days}</p>
              <p className="mt-2 text-[12.5px] text-muted">
                {stats.signups.perDay.at(-1)?.count ?? 0} today
              </p>
            </div>
            <div className="w-full max-w-[420px]">
              <Sparkline values={stats.signups.perDay.map((d) => d.count)} label="Daily new companies over the last 30 days" />
              <div className="mt-1 flex justify-between font-mono text-[10.5px] text-muted">
                <span>{formatDate(stats.signups.perDay[0]?.date)}</span>
                <span>Today</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="By country">
          <BarList
            total={stats.tenants.total}
            items={["SA", "JO"].map((code) => ({
              label: COUNTRY_NAMES[code] ?? code,
              hint: code,
              value: stats.tenants.byCountry.find((c) => c.country === code)?.count ?? 0,
            }))}
          />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card title="Plans" description="Companies per plan" actions={<Link href="/plans" className="text-[13px] text-ink-2 underline-offset-4 hover:underline">Manage</Link>}>
          <BarList total={stats.tenants.total} items={stats.plans.map((p) => ({ label: p.name, hint: p.code, value: p.count }))} />
        </Card>

        <Card title="Recently joined" flush actions={<Link href="/tenants" className="text-[13px] text-ink-2 underline-offset-4 hover:underline">All tenants</Link>}>
          {stats.recent.length === 0 ? (
            <EmptyState title="No companies yet">Onboard the first tenant to see it here.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Company</Th>
                  <Th>Plan</Th>
                  <Th>Status</Th>
                  <Th align="right">Joined</Th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((t) => (
                  <tr key={t.id} className="transition-colors duration-150 hover:bg-surface-2/60">
                    <Td>
                      <Link href={`/tenants/${t.id}`} className="font-medium hover:underline hover:underline-offset-4">
                        {t.tradeName ?? t.legalName}
                      </Link>
                      <span className="ml-2 font-mono text-[11px] text-muted">{t.country}</span>
                    </Td>
                    <Td>
                      {t.subscription ? (
                        <span className="inline-flex items-center gap-2">
                          {t.subscription.plan.name}
                          <Badge tone={subscriptionTone[t.subscription.status]} dot={false}>
                            {titleCase(t.subscription.status)}
                          </Badge>
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <Badge tone={tenantStatusTone[t.status]}>{titleCase(t.status)}</Badge>
                    </Td>
                    <Td align="right" className="text-muted">
                      {timeAgo(t.createdAt)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
