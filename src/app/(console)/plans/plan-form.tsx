"use client";

import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Badge, Field, Input, Textarea, Toggle } from "@/components/ui/primitives";
import type { ActionState } from "@/lib/actions";
import { groupFeatures, STATUS_LABEL } from "@/lib/feature-catalog";
import type { Feature, Plan } from "@/lib/types";

const CURRENCIES = [
  { code: "SAR", name: "Saudi riyal", step: "0.01" },
  { code: "JOD", name: "Jordanian dinar", step: "0.001" },
] as const;

function OptionToggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-line px-3 py-2.5">
      <span className="text-[13.5px]">{label}</span>
      <Toggle name={name} defaultChecked={defaultChecked} />
    </label>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-line py-8 first:pt-0 lg:grid-cols-[minmax(0,16rem)_1fr]">
      <div>
        <h2 className="font-display text-[26px] leading-tight">{title}</h2>
        <p className="mt-1.5 text-[13px] text-ink-2">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function PlanForm({
  action,
  plan,
  features,
  readOnly,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  plan?: Plan;
  features: Feature[];
  readOnly?: boolean;
}) {
  const { state, pending, onSubmit, errors } = useActionForm(action);
  const price = (currency: string, interval: string) =>
    plan?.prices.find((p) => p.currency === currency && p.interval === interval)?.amount ?? "";

  return (
    <form onSubmit={onSubmit} className="max-w-5xl">
      <fieldset disabled={readOnly} className="contents">
        <div className="mb-6 space-y-2">
          <FormMessage tone="danger">{state.error}</FormMessage>
          <FormMessage tone="success">{state.ok ? state.message : undefined}</FormMessage>
        </div>

        <Section title="Details" description="How the plan appears to staff and, if public, at signup.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code" htmlFor="code" hint={plan ? "Codes are permanent." : "Lowercase, e.g. growth"} error={errors.code}>
              <Input id="code" name="code" defaultValue={plan?.code} disabled={Boolean(plan)} required pattern="[a-z][a-z0-9_\-]{1,49}" className="font-mono" />
            </Field>
            <Field label="Name" htmlFor="name" error={errors.name}>
              <Input id="name" name="name" defaultValue={plan?.name} required maxLength={100} />
            </Field>
          </div>
          <Field label="Description" htmlFor="description" optional error={errors.description}>
            <Textarea id="description" name="description" defaultValue={plan?.description ?? ""} maxLength={500} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trial days" htmlFor="trialDays" error={errors.trialDays}>
              <Input id="trialDays" name="trialDays" type="number" min={0} max={365} defaultValue={plan?.trialDays ?? 14} className="font-mono" />
            </Field>
            <Field label="Sort order" htmlFor="sortOrder" hint="Lowest public plan is the signup default." error={errors.sortOrder}>
              <Input id="sortOrder" name="sortOrder" type="number" min={0} defaultValue={plan?.sortOrder ?? 10} className="font-mono" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionToggle name="isActive" label="Active (can be assigned)" defaultChecked={plan?.isActive ?? true} />
            <OptionToggle name="isPublic" label="Public (offered at signup)" defaultChecked={plan?.isPublic ?? true} />
          </div>
        </Section>

        <Section title="Entitlements" description="Switch on what this plan includes, module by module. Limits left empty mean unlimited.">
          {errors.features && <p className="text-[12.5px] text-danger">{errors.features}</p>}
          {groupFeatures(features).map((group) => (
            <fieldset key={group.id} className="overflow-hidden rounded-lg border border-line bg-surface">
              <legend className="sr-only">{group.label}</legend>
              <div className="flex items-baseline justify-between gap-3 border-b border-line bg-surface-2/60 px-4 py-2.5">
                <span className="font-medium text-ink">{group.label}</span>
                <span className="text-[12px] text-muted">{group.blurb}</span>
              </div>
              <ul className="hairline-grid px-4">
                {group.features.map((feature) => {
                  const grant = plan?.features.find((f) => f.featureKey === feature.key);
                  const status = STATUS_LABEL[feature.status];
                  return (
                    <li key={feature.key} className="flex items-center gap-4 py-3">
                      <label htmlFor={`feature:${feature.key}`} className="min-w-0 flex-1 cursor-pointer">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{feature.name}</span>
                          {feature.status !== "AVAILABLE" && (
                            <Badge tone={status.tone} dot={false}>
                              {status.label}
                            </Badge>
                          )}
                        </span>
                        <span className="block text-[12.5px] text-muted">{feature.description}</span>
                      </label>
                      {feature.type === "LIMIT" && (
                        <Input
                          name={`limit:${feature.key}`}
                          type="number"
                          min={0}
                          max={1000000}
                          defaultValue={grant?.limitValue ?? ""}
                          placeholder="Unlimited"
                          aria-label={`${feature.name} limit`}
                          className="w-28 font-mono"
                        />
                      )}
                      <Toggle id={`feature:${feature.key}`} name={`feature:${feature.key}`} defaultChecked={grant?.enabled ?? false} aria-label={`Include ${feature.name}`} />
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          ))}
        </Section>

        <Section title="Prices" description="Per currency and billing interval. Leave empty to not offer it.">
          <div className="grid gap-4 sm:grid-cols-2">
            {CURRENCIES.map((currency) => (
              <fieldset key={currency.code} className="rounded-lg border border-line bg-surface p-4">
                <legend className="px-1 font-mono text-[12px] text-ink-2">
                  {currency.code} · {currency.name}
                </legend>
                <div className="grid grid-cols-2 gap-3">
                  {(["MONTHLY", "YEARLY"] as const).map((interval) => (
                    <Field key={interval} label={interval === "MONTHLY" ? "Monthly" : "Yearly"} htmlFor={`price:${currency.code}:${interval}`}>
                      <Input
                        id={`price:${currency.code}:${interval}`}
                        name={`price:${currency.code}:${interval}`}
                        inputMode="decimal"
                        pattern="\d{1,11}(\.\d{1,3})?"
                        defaultValue={price(currency.code, interval)}
                        className="font-mono"
                      />
                    </Field>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          {errors.prices && <p className="text-[12.5px] text-danger">{errors.prices}</p>}
        </Section>

        {!readOnly && (
          <div className="flex items-center justify-end gap-3 pt-8">
            <p className="mr-auto text-[12.5px] text-muted">Saved changes are recorded in the audit log.</p>
            <SubmitButton pendingLabel="Saving…" pending={pending}>
              {plan ? "Save plan" : "Create plan"}
            </SubmitButton>
          </div>
        )}
      </fieldset>
    </form>
  );
}
