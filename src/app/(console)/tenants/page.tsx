import { ChevronRight, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CompanyCell, PlanTag, SubscriptionCell } from "@/components/tenant-cells";
import { Pagination } from "@/components/ui/pagination";
import { Badge, Button, ButtonLink, Card, cn, EmptyState, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui/primitives";
import { requestNow } from "@/lib/time";
import { adminApi, requireAdmin, requirePermission } from "@/lib/dal";
import { formatDate, tenantStatusTone, timeAgo, titleCase } from "@/lib/format";
import { hasPermission, Perm } from "@/lib/permissions";
import type { Page, Plan, PlatformStats, Tenant } from "@/lib/types";

export const metadata: Metadata = { title: "Tenants" };

const STATUSES = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;

export default async function TenantsPage({ searchParams }: PageProps<"/tenants">) {
  await requirePermission(Perm.TENANTS_READ);
  const now = requestNow();
  const admin = await requireAdmin();
  const sp = await searchParams;
  const one = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters = {
    search: one("search")?.slice(0, 100),
    status: STATUSES.find((s) => s === one("status")),
    country: (["SA", "JO"] as const).find((c) => c === one("country")),
  };
  const page = Math.max(1, Number.parseInt(one("page") ?? "1", 10) || 1);

  const [result, stats, plans] = await Promise.all([
    adminApi<Page<Tenant>>("/platform/tenants", { query: { ...filters, page, pageSize: 20 } }),
    adminApi<PlatformStats>("/platform/stats"),
    adminApi<Plan[]>("/platform/plans", { query: { includeInactive: true } }),
  ]);
  const planOrder = plans.map((p) => p.code);
  const counts = Object.fromEntries(stats.tenants.byStatus.map((s) => [s.status, s.count])) as Record<string, number>;
  const filtered = Boolean(filters.search || filters.status || filters.country);

  // Status tabs keep the other filters; counts are platform-wide.
  const tabHref = (status?: string) => {
    const q = new URLSearchParams();
    if (filters.search) q.set("search", filters.search);
    if (filters.country) q.set("country", filters.country);
    if (status) q.set("status", status);
    const s = q.toString();
    return s ? `/tenants?${s}` : "/tenants";
  };
  const tabs = [
    { label: "All", status: undefined, count: stats.tenants.total },
    ...STATUSES.map((s) => ({ label: titleCase(s), status: s, count: counts[s] ?? 0 })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${stats.tenants.total} ${stats.tenants.total === 1 ? "company" : "companies"}`}
        title="Tenants"
        description="Every company on Pencil, with its plan, subscription and access state."
        actions={hasPermission(admin.permissions, Perm.TENANTS_MANAGE) && <ButtonLink href="/tenants/new">Onboard tenant</ButtonLink>}
      />

      {/* One filter row: status tabs, then search + country. Everything lives in the URL. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter by status" className="flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1">
          {tabs.map((tab) => {
            const current = filters.status === tab.status;
            return (
              <Link
                key={tab.label}
                href={tabHref(tab.status)}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] transition-colors duration-150",
                  current ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                {tab.label}
                <span className={cn("rounded-full px-1.5 text-[11px] tabular", current ? "bg-bg/20" : "bg-surface-2 text-muted")}>{tab.count}</span>
              </Link>
            );
          })}
        </nav>

        <form role="search" className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {filters.status && <input type="hidden" name="status" value={filters.status} />}
          <label className="relative">
            <span className="sr-only">Search tenants</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input name="search" defaultValue={filters.search} placeholder="Name, slug or tax number" className="pl-9 sm:w-64" />
          </label>
          <Select name="country" defaultValue={filters.country ?? ""} aria-label="Country" className="sm:w-40">
            <option value="">All countries</option>
            <option value="SA">Saudi Arabia</option>
            <option value="JO">Jordan</option>
          </Select>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
          {filtered && (
            <Link href="/tenants" className="px-1 text-[13px] text-muted hover:text-ink">
              Clear
            </Link>
          )}
        </form>
      </div>

      <Card flush>
        {result.items.length === 0 ? (
          <EmptyState
            title={filtered ? "No matches" : "No tenants yet"}
            action={!filtered && <ButtonLink href="/tenants/new">Onboard the first tenant</ButtonLink>}
          >
            {filtered ? "Try a different search or clear the filters." : "Companies appear here once they sign up or are onboarded."}
          </EmptyState>
        ) : (
          <>
            {/* Phones: stacked cards instead of a cramped table. */}
            <ul className="hairline-grid sm:hidden">
              {result.items.map((t) => (
                <li key={t.id}>
                  <Link href={`/tenants/${t.id}`} className="block space-y-3 px-4 py-4 active:bg-surface-2">
                    <span className="flex items-start justify-between gap-3">
                      <CompanyCell name={t.legalName} slug={t.slug} country={t.country} />
                      <Badge tone={tenantStatusTone[t.status]}>{titleCase(t.status)}</Badge>
                    </span>
                    {t.subscription && (
                      <span className="flex items-end justify-between gap-3 pl-12 text-[13px]">
                        <PlanTag code={t.subscription.plan.code} name={t.subscription.plan.name} planOrder={planOrder} />
                        <SubscriptionCell {...t.subscription} now={now} />
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="hidden sm:block">
              <Table>
                <thead>
                  <tr>
                    <Th>Company</Th>
                    <Th>Plan</Th>
                    <Th>Subscription</Th>
                    <Th>Access</Th>
                    <Th align="right">Members</Th>
                    <Th align="right">Joined</Th>
                    <Th>
                      <span className="sr-only">Open</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((t) => (
                    <tr key={t.id} className="group relative transition-colors duration-150 hover:bg-surface-2/60">
                      <Td>
                        {/* Stretched link: the whole row is the click target. */}
                        <Link href={`/tenants/${t.id}`} className="outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-focus">
                          <CompanyCell name={t.legalName} slug={t.slug} country={t.country} />
                        </Link>
                      </Td>
                      <Td>{t.subscription ? <PlanTag code={t.subscription.plan.code} name={t.subscription.plan.name} planOrder={planOrder} /> : <span className="text-muted">—</span>}</Td>
                      <Td>{t.subscription ? <SubscriptionCell {...t.subscription} now={now} /> : <span className="text-muted">—</span>}</Td>
                      <Td>
                        <Badge tone={tenantStatusTone[t.status]}>{titleCase(t.status)}</Badge>
                      </Td>
                      <Td align="right">
                        <span className="inline-flex items-center gap-1.5 text-ink-2">
                          <Users className="size-3.5 text-muted" aria-hidden />
                          {t._count.memberships}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="block text-ink-2" title={formatDate(t.createdAt)}>
                          {timeAgo(t.createdAt)}
                        </span>
                        <span className="block text-[11.5px] text-muted">{formatDate(t.createdAt)}</span>
                      </Td>
                      <Td className="w-8 pr-3">
                        <ChevronRight className="size-4 text-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100" aria-hidden />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={result.meta} basePath="/tenants" params={{ ...filters }} />
          </>
        )}
      </Card>
    </div>
  );
}
