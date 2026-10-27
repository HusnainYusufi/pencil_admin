import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, ButtonLink, Card, EmptyState, Input, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { adminApi, requirePermission } from "@/lib/dal";
import { formatDateTime, timeAgo } from "@/lib/format";
import { Perm } from "@/lib/permissions";
import type { AuditLog, CursorPage } from "@/lib/types";

export const metadata: Metadata = { title: "Audit log" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTOR: Record<AuditLog["actorType"], { label: string; tone: "accent" | "info" | "neutral" }> = {
  PLATFORM_ADMIN: { label: "Staff", tone: "accent" },
  USER: { label: "User", tone: "info" },
  SYSTEM: { label: "System", tone: "neutral" },
};

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Append-only · tamper-evident"
        title="Audit log"
        description="Every sign-in, change and administrative action across Pencil. Entries cannot be edited or deleted."
      />

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input name="action" defaultValue={filters.action} placeholder="Action, e.g. tenant.status_changed" aria-label="Action" className="font-mono sm:max-w-xs" />
        <Input name="tenantId" defaultValue={filters.tenantId} placeholder="Tenant ID" aria-label="Tenant ID" className="font-mono sm:max-w-xs" />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(filtered || cursor) && (
          <Link href="/audit" className="text-[13px] text-muted hover:text-ink">
            Reset
          </Link>
        )}
      </form>

      <Card flush>
        {log.items.length === 0 ? (
          <EmptyState title="Nothing recorded">{filtered ? "No events match these filters." : undefined}</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Action</Th>
                <Th>Actor</Th>
                <Th>Tenant</Th>
                <Th>Origin</Th>
              </tr>
            </thead>
            <tbody>
              {log.items.map((event) => (
                <tr key={event.id} className="align-top">
                  <Td className="whitespace-nowrap">
                    <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
                      {timeAgo(event.createdAt)}
                    </time>
                    <div className="font-mono text-[11px] text-muted">{event.createdAt.slice(0, 19).replace("T", " ")}</div>
                  </Td>
                  <Td>
                    <span className="font-mono text-[12.5px]">{event.action}</span>
                    {event.entityType && (
                      <div className="font-mono text-[11px] text-muted">
                        {event.entityType}
                        {event.entityId && ` · ${event.entityId.slice(0, 8)}`}
                      </div>
                    )}
                    {event.metadata && Object.keys(event.metadata).length > 0 && (
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[12px] text-ink-2 hover:text-ink">Details</summary>
                        <pre className="mt-2 max-w-md overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-[11.5px] leading-relaxed text-ink-2">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={ACTOR[event.actorType].tone} dot={false}>
                      {ACTOR[event.actorType].label}
                    </Badge>
                    {event.actorId && <div className="mt-1 font-mono text-[11px] text-muted">{event.actorId.slice(0, 8)}</div>}
                  </Td>
                  <Td>
                    {event.tenantId ? (
                      <Link href={`/tenants/${event.tenantId}`} className="font-mono text-[12px] text-ink-2 hover:text-ink hover:underline">
                        {event.tenantId.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-muted">Platform</span>
                    )}
                  </Td>
                  <Td>
                    <div className="font-mono text-[12px] text-ink-2">{event.ipAddress ?? "—"}</div>
                    {event.requestId && <div className="font-mono text-[11px] text-muted">req {event.requestId.slice(0, 8)}</div>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
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
