import type { Tone } from "@/components/ui/primitives";
import type { Feature, FeatureModule, FeatureStatus } from "./types";

/** Display order and names of product modules: accounting core first. */
export const MODULES: ReadonlyArray<{ id: FeatureModule; label: string; blurb: string }> = [
  { id: "ACCOUNTING", label: "Accounting", blurb: "The ledger every other module posts into" },
  { id: "REPORTS", label: "Reports", blurb: "Statements and analysis from the ledger" },
  { id: "SALES", label: "Sales", blurb: "Invoicing customers and getting paid" },
  { id: "PURCHASES", label: "Purchases", blurb: "Suppliers, bills and expenses" },
  { id: "BANKING", label: "Banking", blurb: "Bank, cash and reconciliation" },
  { id: "TAX", label: "Tax & compliance", blurb: "VAT / GST returns and e-invoicing" },
  { id: "INVENTORY", label: "Inventory", blurb: "Products, stock and warehouses" },
  { id: "PLATFORM", label: "Platform & limits", blurb: "Seats, branches, roles, audit, API" },
];

export const STATUS_LABEL: Record<FeatureStatus, { label: string; tone: Tone }> = {
  AVAILABLE: { label: "Available", tone: "success" },
  BETA: { label: "Beta", tone: "info" },
  COMING_SOON: { label: "Coming soon", tone: "neutral" },
};

/** Features grouped by module in catalog order; empty modules are dropped. */
export function groupFeatures(features: Feature[]) {
  return MODULES.map((m) => ({
    ...m,
    features: features.filter((f) => f.module === m.id).sort((a, b) => a.sortOrder - b.sortOrder),
  })).filter((g) => g.features.length > 0);
}
