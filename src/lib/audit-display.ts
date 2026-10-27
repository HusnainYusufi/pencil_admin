import {
  Activity,
  BookOpen,
  Building2,
  CalendarClock,
  CreditCard,
  GitBranch,
  KeyRound,
  Layers,
  ListTree,
  Shield,
  ToggleRight,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Readable names for the dotted audit actions the API records. */
const NAMES: Record<string, string> = {
  "auth.signup": "Company signed up",
  "auth.login": "User signed in",
  "auth.login_failed": "Failed sign-in",
  "auth.logout": "User signed out",
  "auth.logout_all": "Signed out everywhere",
  "auth.tenant_switched": "Switched company",
  "auth.refresh_reuse_detected": "Token reuse detected",
  "platform.auth.login": "Staff signed in",
  "platform.auth.login_failed": "Staff sign-in failed",
  "platform.auth.logout": "Staff signed out",
  "platform.auth.refresh_reuse_detected": "Staff token reuse detected",
  "tenant.provisioned": "Company provisioned",
  "tenant.updated": "Company profile updated",
  "tenant.status_changed": "Access status changed",
  "subscription.changed": "Subscription changed",
  "entitlement.override_set": "Feature override set",
  "entitlement.override_removed": "Feature override removed",
  "catalog.plan_created": "Plan created",
  "catalog.plan_updated": "Plan updated",
  "catalog.plan_features_replaced": "Plan entitlements changed",
  "catalog.plan_prices_replaced": "Plan prices changed",
  "catalog.feature_created": "Feature created",
  "role.created": "Role created",
  "role.updated": "Role updated",
  "role.deleted": "Role deleted",
  "member.role_changed": "Member role changed",
  "journal.posted": "Journal posted",
  "journal.reversed": "Journal reversed",
};

const CATEGORY_ICONS: Array<[RegExp, LucideIcon]> = [
  [/auth/, KeyRound],
  [/^tenant\./, Building2],
  [/^subscription\./, CreditCard],
  [/^entitlement\./, ToggleRight],
  [/^catalog\./, Layers],
  [/^role\./, Shield],
  [/^member\./, Users],
  [/^journal\./, BookOpen],
  [/^account\./, ListTree],
  [/^fiscal_/, CalendarClock],
  [/^(branch|cost_center)\./, GitBranch],
];

export function auditName(action: string): string {
  if (NAMES[action]) return NAMES[action];
  const last = action.split(".").slice(-2).join(" ").replace(/_/g, " ");
  return last.charAt(0).toUpperCase() + last.slice(1);
}

export const auditIcon = (action: string): LucideIcon => CATEGORY_ICONS.find(([re]) => re.test(action))?.[1] ?? Activity;

/** Security-relevant events get a warning treatment (icon + label, not colour alone). */
export const isSecurityEvent = (action: string) => /failed|reuse_detected/.test(action);

/** One-line summary of the most useful metadata (from → to, plan, reason). */
export function auditSummary(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null;
  const m = metadata as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof m.from === "string" && typeof m.to === "string") parts.push(`${m.from.toLowerCase()} → ${m.to.toLowerCase()}`);
  if (typeof m.toPlan === "string") parts.push(`plan ${m.toPlan}`);
  if (typeof m.fromStatus === "string" && typeof m.toStatus === "string" && m.fromStatus !== m.toStatus) {
    parts.push(`${m.fromStatus.toLowerCase()} → ${m.toStatus.toLowerCase()}`);
  }
  if (typeof m.plan === "string") parts.push(`plan ${m.plan}`);
  if (typeof m.number === "string") parts.push(m.number);
  if (typeof m.reason === "string" && m.reason) parts.push(`“${m.reason}”`);
  return parts.length ? parts.join(" · ") : null;
}
