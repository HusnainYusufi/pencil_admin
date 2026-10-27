/** Shapes returned by the Pencil platform API (`/api/v1/platform/*`). */

export type TenantStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";
export type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
export type BillingInterval = "MONTHLY" | "YEARLY";
export type CountryCode = "SA" | "JO";
export type FeatureType = "BOOLEAN" | "LIMIT";

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currency: string;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: { id: string; code: string; name: string };
}

export interface Tenant {
  id: string;
  slug: string;
  legalName: string;
  tradeName: string | null;
  country: CountryCode;
  baseCurrency: string;
  timezone: string;
  locale: string;
  taxNumber: string | null;
  commercialRegistration: string | null;
  status: TenantStatus;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: Subscription | null;
  _count: { memberships: number };
}

export interface Entitlement {
  enabled: boolean;
  limit: number | null;
}

export interface FeatureOverride {
  tenantId: string;
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
  reason: string | null;
  expiresAt: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface TenantDetail extends Tenant {
  entitlements: Record<string, Entitlement>;
  overrides: FeatureOverride[];
}

export interface Feature {
  key: string;
  name: string;
  description: string | null;
  type: FeatureType;
  createdAt: string;
}

export interface PlanPrice {
  id: string;
  currency: string;
  interval: BillingInterval;
  amount: string;
}

export interface PlanFeature {
  featureKey: string;
  enabled: boolean;
  limitValue: number | null;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isPublic: boolean;
  trialDays: number;
  sortOrder: number;
  prices: PlanPrice[];
  features: PlanFeature[];
}

export interface AuditLog {
  id: string;
  tenantId: string | null;
  actorType: "USER" | "PLATFORM_ADMIN" | "SYSTEM";
  actorId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface PlatformStats {
  tenants: {
    total: number;
    byStatus: Array<{ status: TenantStatus; count: number }>;
    byCountry: Array<{ country: CountryCode; count: number }>;
  };
  subscriptions: Array<{ status: SubscriptionStatus; count: number }>;
  plans: Array<{ planId: string; code: string; name: string; count: number }>;
  signups: { last30Days: number; perDay: Array<{ date: string; count: number }> };
  recent: Array<{
    id: string;
    legalName: string;
    tradeName: string | null;
    country: CountryCode;
    status: TenantStatus;
    createdAt: string;
    subscription: { status: SubscriptionStatus; plan: { code: string; name: string } } | null;
  }>;
}
