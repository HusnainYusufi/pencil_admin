/** Same matching rules as the API: exact, `*`, or a `prefix.*` grant. */
export function hasPermission(granted: readonly string[], required: string): boolean {
  if (granted.includes("*") || granted.includes(required)) return true;
  const parts = required.split(".");
  for (let i = parts.length - 1; i > 0; i--) {
    if (granted.includes(`${parts.slice(0, i).join(".")}.*`)) return true;
  }
  return false;
}

export const Perm = {
  TENANTS_READ: "platform.tenants.read",
  TENANTS_MANAGE: "platform.tenants.manage",
  SUBSCRIPTIONS_MANAGE: "platform.subscriptions.manage",
  CATALOG_READ: "platform.catalog.read",
  CATALOG_MANAGE: "platform.catalog.manage",
  AUDIT_READ: "platform.audit.read",
} as const;
