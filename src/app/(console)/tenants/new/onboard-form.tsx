"use client";

import { useState } from "react";
import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Button, cn, Field, Input } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/format";
import type { Plan } from "@/lib/types";
import { onboardTenant } from "../actions";

const COUNTRIES = [
  { code: "SA", name: "Saudi Arabia", currency: "SAR", tax: "VAT number", hint: "15 digits, starts and ends with 3" },
  { code: "JO", name: "Jordan", currency: "JOD", tax: "Tax ID (TIN)", hint: "Digits only" },
] as const;

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${body.slice(0, 6)}-${body.slice(6, 12)}-${body.slice(12)}7`;
}

function Section({ step, title, description, children }: { step: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-line py-8 first:pt-0 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <div>
        <p className="font-mono text-[11px] tracking-[0.14em] text-muted">{step}</p>
        <h2 className="mt-1 font-display text-[26px] leading-tight">{title}</h2>
        <p className="mt-1.5 text-[13px] text-ink-2">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function OnboardForm({ plans, idempotencyKey }: { plans: Plan[]; idempotencyKey: string }) {
  const { state, pending, onSubmit, errors } = useActionForm(onboardTenant);
  const [country, setCountry] = useState<(typeof COUNTRIES)[number]["code"]>("SA");
  const [password, setPassword] = useState("");
  const selected = COUNTRIES.find((c) => c.code === country)!;
  const invalid = (name: string) => ({ "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? `${name}-error` : undefined });

  return (
    <form onSubmit={onSubmit} className="max-w-5xl">
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <div className="mb-6">
        <FormMessage tone="danger">{state.error}</FormMessage>
      </div>

      <Section step="01" title="Company" description="The legal entity. Currency and time zone follow the country.">
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium">Country</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {COUNTRIES.map((c) => (
              <label
                key={c.code}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors duration-150",
                  country === c.code ? "border-ink bg-surface" : "border-line-strong hover:bg-surface-2",
                )}
              >
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="font-mono text-[11.5px] text-muted">{c.currency}</span>
                </span>
                <input
                  type="radio"
                  name="company.country"
                  value={c.code}
                  checked={country === c.code}
                  onChange={() => setCountry(c.code)}
                  className="size-4 accent-[var(--ink)]"
                />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Legal name" htmlFor="company.legalName" error={errors["company.legalName"]}>
            <Input id="company.legalName" name="company.legalName" required maxLength={200} {...invalid("company.legalName")} />
          </Field>
          <Field label="Trade name" htmlFor="company.tradeName" optional error={errors["company.tradeName"]}>
            <Input id="company.tradeName" name="company.tradeName" maxLength={200} {...invalid("company.tradeName")} />
          </Field>
          <Field label={selected.tax} htmlFor="company.taxNumber" optional hint={selected.hint} error={errors["company.taxNumber"]}>
            <Input id="company.taxNumber" name="company.taxNumber" inputMode="numeric" className="font-mono" {...invalid("company.taxNumber")} />
          </Field>
          <Field label="Commercial registration" htmlFor="company.commercialRegistration" optional error={errors["company.commercialRegistration"]}>
            <Input id="company.commercialRegistration" name="company.commercialRegistration" className="font-mono" {...invalid("company.commercialRegistration")} />
          </Field>
        </div>
      </Section>

      <Section step="02" title="Owner" description="Gets the Owner role. If the email already has a Pencil account, it is reused.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="owner.fullName" error={errors["owner.fullName"]}>
            <Input id="owner.fullName" name="owner.fullName" required autoComplete="off" {...invalid("owner.fullName")} />
          </Field>
          <Field label="Email" htmlFor="owner.email" error={errors["owner.email"]}>
            <Input id="owner.email" name="owner.email" type="email" required autoComplete="off" {...invalid("owner.email")} />
          </Field>
        </div>
        <Field
          label="Temporary password"
          htmlFor="owner.password"
          optional
          hint="Required for new accounts. Share it through a secure channel, never by plain email."
          error={errors["owner.password"]}
        >
          <div className="flex gap-2">
            <Input
              id="owner.password"
              name="owner.password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              spellCheck={false}
              className="font-mono"
              {...invalid("owner.password")}
            />
            <Button type="button" variant="secondary" onClick={() => setPassword(generatePassword())}>
              Generate
            </Button>
          </div>
        </Field>
      </Section>

      <Section step="03" title="Plan" description="Paid plans start with their trial period. You can change the plan at any time.">
        <fieldset className="grid gap-3 sm:grid-cols-3">
          <legend className="sr-only">Plan</legend>
          {plans.map((plan, i) => {
            const monthly = plan.prices.find((p) => p.currency === selected.currency && p.interval === "MONTHLY");
            return (
              <label
                key={plan.id}
                className="group relative flex cursor-pointer flex-col rounded-lg border border-line-strong bg-surface p-4 transition-colors duration-150 hover:bg-surface-2 has-[:checked]:border-ink has-[:checked]:shadow-card"
              >
                <input type="radio" name="planCode" value={plan.code} defaultChecked={i === 0} className="absolute right-4 top-4 size-4 accent-[var(--ink)]" />
                <span className="font-display text-[22px] leading-tight">{plan.name}</span>
                <span className="mt-1 font-mono text-[13px] text-ink-2">
                  {monthly ? `${formatMoney(monthly.amount, monthly.currency)} / mo` : "No price set"}
                </span>
                <span className="mt-2 text-[12.5px] text-muted">
                  {plan.trialDays > 0 ? `${plan.trialDays}-day trial` : "No trial"}
                  {!plan.isPublic && " · private"}
                </span>
              </label>
            );
          })}
        </fieldset>
      </Section>

      <div className="flex items-center justify-end gap-3 pt-8">
        <p className="mr-auto text-[12.5px] text-muted">This action is recorded in the audit log.</p>
        <SubmitButton pendingLabel="Creating company…" pending={pending}>
          Create company
        </SubmitButton>
      </div>
    </form>
  );
}
