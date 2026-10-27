import { AlertTriangle, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, ButtonLink, Card, cn, EmptyState, Input, PageHeader } from "@/components/ui/primitives";
import { auditIcon, auditName, auditSummary, isSecurityEvent } from "@/lib/audit-display";
import { adminApi, requirePermission } from "@/lib/dal";
import { formatDateTime } from "@/lib/format";
import { Perm } from "@/lib/permissions";
import type { AuditLog, CursorPage } from "@/lib/types";

export const metadata: Metadata = { title: "Audit log" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTOR: Record<AuditLog["actorType"], { label: string; tone: "accent" | "info" | "neutral" }> = {
  PLATFORM_ADMIN: { label: "Staff", tone: "accent" },
  USER: { label: "Tenant user", tone: "info" },
  SYSTEM: { label: "System", tone: "neutral" },
};
const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function dayHeading(iso: string): string {
  const day = iso.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return dayFmt.format(new Date(iso));
}

export default async function AuditPage({ searchParams }: PageProps<"/audit">) {
  await requirePermission(Perm.AUDIT_READ);
  const sp = await searchParams;
  const one = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string).trim() : undefined);
  const filters = {
    action: one("action")?.slice(0, 100) || undefined,
    tenantId: one("tenantId") && UUID.test(one("tenantId")!) ? one("tenantId") : undefined,
    actorId: one("actorId") && UUID.test(one("actorId")!) ? one("actorId") : undefined,
  };
  const cursor = one("cursor")?.slice(0, 512);

  const log = await adminApi<CursorPage<AuditLog>>("/platform/audit-logs", { query: { ...filters, cursor, limit: 50 } });
  const nextHref = (() => {
    if (!log.nextCursor) return null;
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) q.set(k, v);
    q.set("cursor", log.nextCursor);
    return `/audit?${q.toString()}`;
  })();
  const filtered = Boolean(filters.action || filters.tenantId || filters.actorId);

  // Group consecutive events by UTC day (the list is newest-first).
  const groups: Array<{ heading: string; events: AuditLog[] }> = [];
  for (const event of log.items) {
    const heading = dayHeading(event.createdAt);
    const last = groups[groups.length - 1];
    if (last?.heading === heading) last.events.push(event);
    else groups.push({ heading, events: [event] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Append-only · tamper-evident"
        title="Audit log"
        description="Every sign-in, change and administrative action across Pencil. Entries cannot be edited or deleted."
      />

      <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative sm:w-80">
          <span className="sr-only">Action</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input name="action" defaultValue={filters.action} placeholder="Action, e.g. tenant.status_changed" className="pl-9 font-mono text-[13px]" />
        </label>
        <Input name="tenantId" defaultValue={filters.tenantId} placeholder="Tenant ID" aria-label="Tenant ID" className="font-mono text-[13px] sm:w-80" />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(filtered || cursor) && (
          <Link href="/audit" className="px-1 text-[13px] text-muted hover:text-ink">
            Reset
          </Link>
        )}
      </form>

      <Card flush>
        {log.items.length === 0 ? (
          <EmptyState title="Nothing recorded">{filtered ? "No events match these filters." : undefined}</EmptyState>
        ) : (
          <div>
            {groups.map((group) => (
              <section key={group.heading} aria-label={group.heading}>
                <h2 className="border-b border-line bg-surface-2/60 px-5 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  {group.heading}
                </h2>
                <ol>
                  {group.events.map((event, i) => {
                    const Icon = auditIcon(event.action);
                    const security = isSecurityEvent(event.action);
                    const summary = auditSummary(event.metadata);
                    return (
                      <li key={event.id} className="relative grid grid-cols-[4.5rem_2.25rem_1fr] gap-x-3 px-5 py-3 transition-colors duration-150 hover:bg-surface-2/40 sm:grid-cols-[5.5rem_2.25rem_1fr_auto]">
                        <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)} className="pt-1.5 font-mono text-[11.5px] tabular text-muted">
                          {time.format(new Date(event.createdAt))}
                        </time>

                        {/* Timeline spine + category icon */}
                        <div className="relative flex justify-center">
                          {i < group.events.length - 1 && <span aria-hidden className="absolute top-8 -bottom-3 w-px bg-line" />}
                          <span
                            className={cn(
                              "relative flex size-8 items-center justify-center rounded-full border",
                              security ? "border-warning/40 bg-warning-bg text-warning" : "border-line bg-surface text-ink-2",
                            )}
                          >
                            <Icon className="size-3.5" aria-hidden />
                          </span>
                        </div>

                        <div className="min-w-0 pb-1">
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-ink">{auditName(event.action)}</span>
                            {security && (
                              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-warning">
                                <AlertTriangle className="size-3" aria-hidden /> Security
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                            <span className="font-mono">{event.action}</span>
                            {summary && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="text-ink-2">{summary}</span>
                              </>
                            )}
                          </p>
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <details className="mt-1.5">
                              <summary className="cursor-pointer text-[12px] text-ink-2 hover:text-ink">Details</summary>
                              <pre className="mt-2 max-w-xl overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-[11.5px] leading-relaxed text-ink-2">
                                {JSON.stringify(event.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>

                        <div className="col-start-3 mt-2 flex flex-wrap items-center gap-2 text-[12px] sm:col-start-auto sm:mt-0 sm:justify-end sm:text-right">
                          <Badge tone={ACTOR[event.actorType].tone} dot={false}>
                            {ACTOR[event.actorType].label}
                          </Badge>
                          {event.tenantId ? (
                            <Link href={`/tenants/${event.tenantId}`} className="relative z-10 font-mono text-ink-2 hover:text-ink hover:underline">
                              {event.tenantId.slice(0, 8)}
                            </Link>
                          ) : (
                            <span className="text-muted">Platform</span>
                          )}
                          <span className="font-mono text-muted" title={event.requestId ? `Request ${event.requestId}` : undefined}>
                            {event.ipAddress ?? "—"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
        {nextHref && (
          <div className="flex justify-center border-t border-line p-3">
            <ButtonLink href={nextHref} variant="secondary" size="sm">
              Older entries
            </ButtonLink>
          </div>
        )}
      </Card>
    </div>
  );
}
