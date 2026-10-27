import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { Badge, Button, ButtonLink, Card, EmptyState, Input, PageHeader, Select, Table, Td, Th } from "@/components/ui/primitives";
import { adminApi, requireAdmin, requirePermission } from "@/lib/dal";
import { formatDate, subscriptionTone, tenantStatusTone, titleCase } from "@/lib/format";
import { hasPermission, Perm } from "@/lib/permissions";
import type { Page, Tenant } from "@/lib/types";

export const metadata: Metadata = { title: "Tenants" };

const STATUSES = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;

export default async function TenantsPage({ searchParams }: PageProps<"/tenants">) {
  await requirePermission(Perm.TENANTS_READ);
  const admin = await requireAdmin();
  const sp = await searchParams;
  const one = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : undefined);

  const filters = {
    search: one("search")?.slice(0, 100),
    status: STATUSES.find((s) => s === one("status")),
    country: (["SA", "JO"] as const).find((c) => c === one("country")),
  };
  const page = Math.max(1, Number.parseInt(one("page") ?? "1", 10) || 1);

  const result = await adminApi<Page<Tenant>>("/platform/tenants", {
    query: { ...filters, page, pageSize: 20 },
  });
  const filtered = Boolean(filters.search || filters.status || filters.country);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${result.meta.total} ${result.meta.total === 1 ? "company" : "companies"}`}
        title="Tenants"
        description="Every company on Pencil, with its plan, subscription and access state."
        actions={hasPermission(admin.permissions, Perm.TENANTS_MANAGE) && <ButtonLink href="/tenants/new">Onboard tenant</ButtonLink>}
      />

      {/* Plain GET form: filters live in the URL, shareable and back-button friendly. */}
      <form role="search" className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search tenants</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input name="search" defaultValue={filters.search} placeholder="Name, slug or tax number" className="pl-9" />
        </label>
        <Select name="status" defaultValue={filters.status ?? ""} aria-label="Status" className="sm:w-40">
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
        <Select name="country" defaultValue={filters.country ?? ""} aria-label="Country" className="sm:w-44">
          <option value="">Any country</option>
          <option value="SA">Saudi Arabia</option>
          <option value="JO">Jordan</option>
        </Select>
        <Button type="submit" variant="secondary">
          Apply
        </Button>
        {filtered && (
          <Link href="/tenants" className="text-[13px] text-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

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
                  <Link href={`/tenants/${t.id}`} className="block px-4 py-3.5 active:bg-surface-2">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{t.legalName}</span>
                        <span className="block truncate font-mono text-[11.5px] text-muted">{t.slug}</span>
                      </span>
                      <Badge tone={tenantStatusTone[t.status]}>{titleCase(t.status)}</Badge>
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-2">
                      <span className="font-mono">{t.country}</span>
                      <span aria-hidden>·</span>
                      {t.subscription?.plan.name ?? "No plan"}
                      {t.subscription && (
                        <Badge tone={subscriptionTone[t.subscription.status]} dot={false}>
                          {titleCase(t.subscription.status)}
                        </Badge>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="hidden sm:block">
            <Table>
              <thead>
                <tr>
                  <Th>Company</Th>
                  <Th>Country</Th>
                  <Th>Plan</Th>
                  <Th>Subscription</Th>
                  <Th>Access</Th>
                  <Th align="right">Members</Th>
                  <Th align="right">Joined</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((t) => (
                  <tr key={t.id} className="transition-colors duration-150 hover:bg-surface-2/60">
                    <Td>
                      <Link href={`/tenants/${t.id}`} className="font-medium text-ink hover:underline hover:underline-offset-4">
                        {t.legalName}
                      </Link>
                      <div className="font-mono text-[11.5px] text-muted">{t.slug}</div>
                    </Td>
                    <Td>
                      <span className="font-mono text-[12px]">{t.country}</span>
                      <span className="ml-1.5 text-muted">{t.baseCurrency}</span>
                    </Td>
                    <Td>{t.subscription?.plan.name ?? "—"}</Td>
                    <Td>
                      {t.subscription ? (
                        <Badge tone={subscriptionTone[t.subscription.status]}>{titleCase(t.subscription.status)}</Badge>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <Badge tone={tenantStatusTone[t.status]}>{titleCase(t.status)}</Badge>
                    </Td>
                    <Td align="right">{t._count.memberships}</Td>
                    <Td align="right" className="text-muted">
                      {formatDate(t.createdAt)}
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
