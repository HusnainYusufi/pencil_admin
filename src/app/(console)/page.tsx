import { AlertTriangle, Ban, CheckCircle2, Clock, OctagonX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ColumnChart } from "@/components/charts/column-chart";
import { ChartTable, Delta, Meter, Sparkline, StatTile } from "@/components/charts/figures";
import { percent } from "@/components/charts/scale";
import { StackedBar, type Segment } from "@/components/charts/stacked-bar";
import { CompanyCell, PlanTag } from "@/components/tenant-cells";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { COUNTRY_ORDER, OTHER_COLOR, seriesColor, STATUS_BG, STATUS_FILL } from "@/lib/chart-colors";
import { adminApi, requirePermission } from "@/lib/dal";
import { COUNTRY_NAMES, subscriptionTone, tenantStatusTone, timeAgo, titleCase } from "@/lib/format";
import { Perm } from "@/lib/permissions";
import type { PlatformStats, SubscriptionStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Overview" };

const dayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const dayTick = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Subscription states use the reserved status palette, each with an icon. */
const SUBSCRIPTION_STATES: Array<{ status: SubscriptionStatus; tone: keyof typeof STATUS_FILL; icon: typeof Clock }> = [
  { status: "ACTIVE", tone: "good", icon: CheckCircle2 },
  { status: "TRIALING", tone: "neutral", icon: Clock },
  { status: "PAST_DUE", tone: "warning", icon: AlertTriangle },
  { status: "CANCELED", tone: "serious", icon: Ban },
  { status: "EXPIRED", tone: "critical", icon: OctagonX },
];

export default async function OverviewPage() {
  await requirePermission(Perm.TENANTS_READ);
  const stats = await adminApi<PlatformStats>("/platform/stats");

  const byStatus = Object.fromEntries(stats.tenants.byStatus.map((s) => [s.status, s.count]));
  const bySub = Object.fromEntries(stats.subscriptions.map((s) => [s.status, s.count])) as Partial<Record<SubscriptionStatus, number>>;
  const subscriptionTotal = stats.subscriptions.reduce((n, s) => n + s.count, 0);
  const total = stats.tenants.total;

  const perDay = stats.signups.perDay;
  const sum = (from: number, to: number) => perDay.slice(from, to).reduce((n, d) => n + d.count, 0);
  const thisWeek = sum(-7, perDay.length);
  const priorWeek = sum(-14, -7);
  // Company count at the end of each of the last 14 days (derived from daily signups).
  const cumulative = perDay.slice(-14).map((_, i, arr) => total - arr.slice(i + 1).reduce((n, d) => n + d.count, 0));

  const pastDue = bySub.PAST_DUE ?? 0;
  const suspended = byStatus.SUSPENDED ?? 0;
  const attention = pastDue + suspended;

  // Plans: colour follows the plan (stable sortOrder), tail folds into "Other".
  const planOrder = stats.plans.map((p) => p.code);
  const planSegments: Segment[] = stats.plans.slice(0, 3).map((p) => {
    const color = seriesColor(p.code, planOrder);
    return { key: p.code, label: p.name, value: p.count, fill: color.fill, swatch: color.bg };
  });
  const otherPlans = stats.plans.slice(3).reduce((n, p) => n + p.count, 0);
  if (stats.plans.length > 3) planSegments.push({ key: "other", label: "Other plans", value: otherPlans, fill: OTHER_COLOR.fill, swatch: OTHER_COLOR.bg });

  const subscriptionSegments: Segment[] = SUBSCRIPTION_STATES.map(({ status, tone, icon: Icon }) => ({
    key: status,
    label: titleCase(status),
    value: bySub[status] ?? 0,
    fill: STATUS_FILL[tone],
    swatch: STATUS_BG[tone],
    icon: <Icon className="size-3.5 text-muted" aria-hidden />,
  })).filter((s) => s.value > 0 || ["ACTIVE", "TRIALING"].includes(s.key));

  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date());

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={today}
        title="Overview"
        description="The health of every company on Pencil, at a glance."
        actions={<ButtonLink href="/tenants/new">Onboard tenant</ButtonLink>}
      />

      {/* gap-px over a hairline background = dividers that are right at every breakpoint. */}
      <section aria-label="Key figures" className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line shadow-card sm:grid-cols-2 xl:grid-cols-4 [&>*]:bg-surface">
        <StatTile label="Companies" value={total} delta={{ value: thisWeek, period: "new this week" }}>
          {cumulative.length > 1 && <Sparkline values={cumulative} />}
        </StatTile>
        <StatTile label="Active" value={byStatus.ACTIVE ?? 0} footnote={`${percent(byStatus.ACTIVE ?? 0, total)} of companies can sign in`}>
          <div className="mb-1 w-24">
            <Meter value={byStatus.ACTIVE ?? 0} max={total} label="Active share of companies" />
          </div>
        </StatTile>
        <StatTile label="On trial" value={bySub.TRIALING ?? 0} footnote={`${percent(bySub.TRIALING ?? 0, subscriptionTotal)} of subscriptions`}>
          <div className="mb-1 w-24">
            <Meter value={bySub.TRIALING ?? 0} max={subscriptionTotal} label="Trialing share of subscriptions" />
          </div>
        </StatTile>
        <StatTile
          label="Needs attention"
          value={attention}
          footnote={
            attention === 0 ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="size-3.5" aria-hidden /> All clear
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-warning">
                <AlertTriangle className="size-3.5" aria-hidden />
                {pastDue} past due · {suspended} suspended
              </span>
            )
          }
        />
      </section>

      <Card title="New companies" description="Self-service sign-ups and staff onboardings per day, last 30 days">
        <div className="mb-6 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="text-[52px] font-semibold leading-none tracking-[-0.02em]">{stats.signups.last30Days}</p>
          <div className="pb-1.5 text-[13px]">
            <Delta value={thisWeek - priorWeek} period="vs the previous 7 days" />
          </div>
        </div>
        <ColumnChart
          unit={stats.signups.last30Days === 1 ? "company" : "companies"}
          data={perDay.map((d) => ({ key: d.date, label: dayLabel.format(new Date(d.date)), tick: dayTick.format(new Date(d.date)), value: d.count }))}
        />
        <ChartTable
          caption="New companies per day, last 30 days"
          headers={["Day", "New companies"]}
          rows={[...perDay].reverse().map((d) => [dayLabel.format(new Date(d.date)), d.count])}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Plan mix" description="Companies per plan" actions={<Link href="/plans" className="text-[13px] text-ink-2 underline-offset-4 hover:underline">Manage</Link>}>
          <StackedBar segments={planSegments} unit="companies" />
        </Card>

        <Card title="Subscriptions" description="Billing state across all companies">
          <StackedBar segments={subscriptionSegments} unit="subscriptions" />
        </Card>

        <Card title="Countries" description="Where companies are registered">
          <ul className="space-y-5">
            {COUNTRY_ORDER.map((code) => {
              const count = stats.tenants.byCountry.find((c) => c.country === code)?.count ?? 0;
              return (
                <li key={code}>
                  <div className="mb-2 flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="flex items-center gap-2 text-ink">
                      <span className="rounded border border-line px-1 font-mono text-[10px] text-ink-2">{code}</span>
                      {COUNTRY_NAMES[code]}
                    </span>
                    <span>
                      <span className="font-medium tabular text-ink">{count}</span>
                      <span className="ml-2 inline-block w-9 text-right tabular text-muted">{percent(count, total)}</span>
                    </span>
                  </div>
                  <Meter value={count} max={total} tone="ink" label={`${COUNTRY_NAMES[code]}: ${count} of ${total} companies`} />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card title="Recently joined" flush actions={<Link href="/tenants" className="text-[13px] text-ink-2 underline-offset-4 hover:underline">All tenants</Link>}>
        {stats.recent.length === 0 ? (
          <EmptyState title="No companies yet">Onboard the first tenant to see it here.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Plan</Th>
                <Th>Subscription</Th>
                <Th>Access</Th>
                <Th align="right">Joined</Th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((t) => (
                <tr key={t.id} className="group relative transition-colors duration-150 hover:bg-surface-2/60">
                  <Td>
                    <Link href={`/tenants/${t.id}`} className="outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-focus">
                      <CompanyCell name={t.tradeName ?? t.legalName} country={t.country} />
                    </Link>
                  </Td>
                  <Td>{t.subscription ? <PlanTag code={t.subscription.plan.code} name={t.subscription.plan.name} planOrder={planOrder} /> : "—"}</Td>
                  <Td>{t.subscription ? <Badge tone={subscriptionTone[t.subscription.status]}>{titleCase(t.subscription.status)}</Badge> : "—"}</Td>
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
  );
}
