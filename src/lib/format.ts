import type { Tone } from "@/components/ui/primitives";
import type { SubscriptionStatus, TenantStatus } from "./types";

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export const formatDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "—");
export const formatDateTime = (iso: string | null | undefined) => (iso ? `${dateTimeFmt.format(new Date(iso))} UTC` : "—");

export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const units: Array<[number, string]> = [
    [60, "m"],
    [3600, "h"],
    [86_400, "d"],
    [2_592_000, "mo"],
    [31_536_000, "y"],
  ];
  let label = `${Math.floor(seconds / 60)}m`;
  for (const [size, suffix] of units) if (seconds >= size) label = `${Math.floor(seconds / size)}${suffix}`;
  return `${label} ago`;
}

const MINOR_UNITS: Record<string, number> = { SAR: 2, JOD: 3, USD: 2, AED: 2, KWD: 3, BHD: 3, OMR: 3 };

/** Decimal strings stay strings: we only pad to the currency's scale, never use floats for money. */
export function formatMoney(amount: string, currency: string): string {
  const scale = MINOR_UNITS[currency] ?? 2;
  const [whole = "0", fraction = ""] = amount.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${currency} ${grouped}.${fraction.padEnd(scale, "0").slice(0, scale)}`;
}

export const COUNTRY_NAMES: Record<string, string> = { SA: "Saudi Arabia", JO: "Jordan" };

export const tenantStatusTone: Record<TenantStatus, Tone> = {
  ACTIVE: "success",
  SUSPENDED: "danger",
  ARCHIVED: "neutral",
};

export const subscriptionTone: Record<SubscriptionStatus, Tone> = {
  TRIALING: "info",
  ACTIVE: "success",
  PAST_DUE: "warning",
  CANCELED: "neutral",
  EXPIRED: "danger",
};

export const titleCase = (value: string) =>
  value.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
