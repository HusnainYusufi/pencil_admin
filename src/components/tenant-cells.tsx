import { AlertTriangle, CalendarClock } from "lucide-react";
import { Meter } from "@/components/charts/figures";
import { Badge, cn } from "@/components/ui/primitives";
import { seriesColor } from "@/lib/chart-colors";
import { formatDate, subscriptionTone, titleCase } from "@/lib/format";
import type { SubscriptionStatus } from "@/lib/types";

const initials = (name: string) =>
  name
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

/** Monogram + name + slug. Neutral on purpose: colour is reserved for data. */
export function CompanyCell({ name, slug, country }: { name: string; slug?: string; country?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-[12px] font-semibold text-ink-2"
      >
        {initials(name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink">{name}</span>
        <span className="flex items-center gap-1.5 font-mono text-[11.5px] text-muted">
          {country && <span className="rounded border border-line px-1 text-[10px] text-ink-2">{country}</span>}
          {slug && <span className="truncate">{slug}</span>}
        </span>
      </span>
    </span>
  );
}

/** Plan chip whose swatch matches the plan's colour in every chart. */
export function PlanTag({ code, name, planOrder }: { code: string; name: string; planOrder: readonly string[] }) {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <span aria-hidden className={cn("size-2 rounded-[2px]", seriesColor(code, planOrder).bg)} />
      {name}
    </span>
  );
}

const DAY = 86_400_000;

/**
 * Subscription state + where it is in time. Trials show a countdown meter;
 * ≤ 3 days left switches to the warning status with an icon (never colour alone).
 */
export function SubscriptionCell({
  status,
  trialEndsAt,
  currentPeriodStart,
  currentPeriodEnd,
  now,
}: {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  /** Request time (requestNow()), so renders are deterministic. */
  now: number;
}) {
  if (status === "TRIALING" && trialEndsAt) {
    const end = new Date(trialEndsAt).getTime();
    const start = new Date(currentPeriodStart).getTime();
    const left = Math.max(0, Math.ceil((end - now) / DAY));
    const total = Math.max(1, Math.round((end - start) / DAY));
    const urgent = left <= 3;
    return (
      <span className="block w-40">
        <span className="mb-1.5 flex items-center justify-between gap-2">
          <Badge tone={subscriptionTone[status]} dot={false}>
            Trial
          </Badge>
          <span className={cn("inline-flex items-center gap-1 text-[12px] tabular", urgent ? "font-medium text-warning" : "text-muted")}>
            {urgent && <AlertTriangle className="size-3" aria-hidden />}
            {left === 0 ? "ends today" : `${left}d left`}
          </span>
        </span>
        {/* Remaining time: full at the start of the trial, draining to the end. */}
        <Meter value={left} max={total} tone={urgent ? "warning" : "series"} label={`Trial: ${left} of ${total} days left`} />
      </span>
    );
  }
  return (
    <span className="block">
      <Badge tone={subscriptionTone[status]}>{titleCase(status)}</Badge>
      {status === "ACTIVE" && (
        <span className="mt-1 flex items-center gap-1 text-[12px] text-muted">
          <CalendarClock className="size-3" aria-hidden />
          Renews {formatDate(currentPeriodEnd)}
        </span>
      )}
    </span>
  );
}
