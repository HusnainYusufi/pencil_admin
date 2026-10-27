"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Dialog, FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Button, Field, Input, Select, Textarea, Toggle } from "@/components/ui/primitives";
import type { ActionState } from "@/lib/actions";
import type { Feature, FeatureOverride, Plan, Subscription, TenantStatus } from "@/lib/types";
import { changeSubscription, removeFeatureOverride, setFeatureOverride, setTenantStatus } from "../actions";

/** Closes the dialog once its action succeeded (the page re-renders with fresh data). */
function useCloseOnSuccess(state: ActionState, close: () => void) {
  useEffect(() => {
    if (state.ok) close();
  }, [state, close]);
}

function DialogForm({
  action,
  close,
  submit,
  danger,
  children,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  close: () => void;
  submit: string;
  danger?: boolean;
  children: (state: ActionState) => ReactNode;
}) {
  const { state, pending, onSubmit } = useActionForm(action);
  useCloseOnSuccess(state, close);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage tone="danger">{state.error}</FormMessage>
      {children(state)}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <SubmitButton variant={danger ? "danger" : "primary"} pending={pending}>
          {submit}
        </SubmitButton>
      </div>
    </form>
  );
}

export function StatusDialog({ tenantId, status, name }: { tenantId: string; status: TenantStatus; name: string }) {
  if (status !== "ACTIVE") {
    return (
      <Dialog trigger="Reactivate" title="Reactivate tenant" description={`${name} regains access immediately.`}>
        {(close) => (
          <DialogForm action={setTenantStatus.bind(null, tenantId)} close={close} submit="Reactivate">
            {() => <input type="hidden" name="status" value="ACTIVE" />}
          </DialogForm>
        )}
      </Dialog>
    );
  }
  return (
    <Dialog
      trigger="Suspend"
      triggerVariant="secondary"
      title="Suspend tenant"
      description={`Every member of ${name} loses access within seconds. Data is kept and access can be restored.`}
    >
      {(close) => (
        <DialogForm action={setTenantStatus.bind(null, tenantId)} close={close} submit="Suspend tenant" danger>
          {(state) => (
            <>
              <input type="hidden" name="status" value="SUSPENDED" />
              <Field label="Reason" htmlFor="reason" hint="Recorded in the audit log and shown to Pencil staff." error={state.fieldErrors?.reason}>
                <Textarea id="reason" name="reason" required maxLength={500} placeholder="e.g. Unpaid invoices since September" />
              </Field>
            </>
          )}
        </DialogForm>
      )}
    </Dialog>
  );
}

export function SubscriptionDialog({ tenantId, plans, subscription }: { tenantId: string; plans: Plan[]; subscription: Subscription }) {
  return (
    <Dialog trigger="Change plan" title="Change subscription" description="Entitlements update for every member right away.">
      {(close) => (
        <DialogForm action={changeSubscription.bind(null, tenantId)} close={close} submit="Save subscription">
          {(state) => (
            <>
              <Field label="Plan" htmlFor="planCode" error={state.fieldErrors?.planCode}>
                <Select id="planCode" name="planCode" defaultValue={subscription.plan.code}>
                  {plans.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name}
                      {!p.isActive ? " (inactive)" : ""}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Status" htmlFor="status">
                  <Select id="status" name="status" defaultValue={subscription.status}>
                    {["TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"].map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ").toLowerCase()}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Billing" htmlFor="billingInterval">
                  <Select id="billingInterval" name="billingInterval" defaultValue={subscription.billingInterval}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </Select>
                </Field>
              </div>
            </>
          )}
        </DialogForm>
      )}
    </Dialog>
  );
}

export function OverrideDialog({ tenantId, feature, current }: { tenantId: string; feature: Feature; current?: FeatureOverride }) {
  return (
    <Dialog trigger="Edit" triggerVariant="ghost" title={feature.name} description="An override replaces the plan's value for this tenant only.">
      {(close) => (
        <DialogForm action={setFeatureOverride.bind(null, tenantId, feature.key)} close={close} submit="Save override">
          {(state) => (
            <>
              <label className="flex items-center gap-3 rounded-md border border-line px-3 py-2.5">
                <input type="checkbox" name="enabled" defaultChecked={current?.enabled ?? true} className="size-4 accent-[var(--ink)]" />
                <span className="text-[13.5px]">Feature enabled</span>
              </label>
              {feature.type === "LIMIT" && (
                <Field label="Limit" htmlFor="limitValue" hint="Leave empty for unlimited." error={state.fieldErrors?.limitValue}>
                  <Input id="limitValue" name="limitValue" type="number" min={0} max={1000000} defaultValue={current?.limitValue ?? ""} className="font-mono" />
                </Field>
              )}
              <Field label="Reason" htmlFor="reason" error={state.fieldErrors?.reason}>
                <Input id="reason" name="reason" defaultValue={current?.reason ?? ""} maxLength={500} placeholder="e.g. Enterprise pilot" required />
              </Field>
              <Field label="Expires" htmlFor="expiresAt" optional hint="The plan value applies again after this date." error={state.fieldErrors?.expiresAt}>
                <Input id="expiresAt" name="expiresAt" type="date" defaultValue={current?.expiresAt?.slice(0, 10) ?? ""} />
              </Field>
            </>
          )}
        </DialogForm>
      )}
    </Dialog>
  );
}

export function RemoveOverrideButton({ tenantId, featureKey }: { tenantId: string; featureKey: string }) {
  return (
    <form action={removeFeatureOverride.bind(null, tenantId, featureKey)}>
      <SubmitButton variant="secondary" size="sm" pendingLabel="Resetting…">
        Reset
      </SubmitButton>
    </form>
  );
}

/**
 * One-click per-company toggle. Writes an override immediately (audited with
 * the staff member and time), optimistic with rollback if the API refuses.
 */
export function FeatureSwitch({ tenantId, feature, enabled, limit }: { tenantId: string; feature: Feature; enabled: boolean; limit: number | null }) {
  const [checked, setChecked] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <span className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-[12px] text-danger">
          {error}
        </span>
      )}
      <Toggle
        checked={checked}
        disabled={pending}
        aria-label={`${feature.name} for this company`}
        onChange={(event) => {
          const next = event.target.checked;
          setChecked(next);
          setError(null);
          startTransition(async () => {
            const form = new FormData();
            if (next) form.set("enabled", "on");
            form.set("reason", next ? "Enabled in console" : "Disabled in console");
            if (feature.type === "LIMIT" && limit !== null) form.set("limitValue", String(limit));
            const result = await setFeatureOverride(tenantId, feature.key, {}, form);
            if (!result.ok) {
              setChecked(!next);
              setError(result.error ?? "Could not save");
            }
          });
        }}
      />
    </span>
  );
}
