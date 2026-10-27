"use client";

import { useEffect } from "react";
import { Dialog, FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Button, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { MODULES } from "@/lib/feature-catalog";
import { createFeature } from "../plans/actions";

function NewFeatureForm({ close }: { close: () => void }) {
  const { state, pending, onSubmit, errors } = useActionForm(createFeature);
  useEffect(() => {
    if (state.ok) close();
  }, [state, close]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormMessage tone="danger">{state.error}</FormMessage>
      <Field label="Key" htmlFor="key" hint="Permanent. Dotted snake_case, e.g. reports.advanced" error={errors.key}>
        <Input id="key" name="key" required pattern="[a-z][a-z0-9_]*(\.[a-z0-9_]+)*" className="font-mono" />
      </Field>
      <Field label="Name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" required maxLength={150} />
      </Field>
      <Field label="Type" htmlFor="type" error={errors.type}>
        <Select id="type" name="type" defaultValue="BOOLEAN">
          <option value="BOOLEAN">On / off</option>
          <option value="LIMIT">Limit (numeric quota)</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Module" htmlFor="module" error={errors.module}>
          <Select id="module" name="module" defaultValue="ACCOUNTING">
            {MODULES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status" error={errors.status}>
          <Select id="status" name="status" defaultValue="COMING_SOON">
            <option value="AVAILABLE">Available</option>
            <option value="BETA">Beta</option>
            <option value="COMING_SOON">Coming soon</option>
          </Select>
        </Field>
      </div>
      <Field label="Description" htmlFor="description" optional error={errors.description}>
        <Textarea id="description" name="description" maxLength={500} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={close}>
          Cancel
        </Button>
        <SubmitButton pending={pending}>Create feature</SubmitButton>
      </div>
    </form>
  );
}

export function NewFeatureDialog() {
  return (
    <Dialog trigger="New feature" triggerVariant="primary" triggerSize="md" title="New feature" description="Ship the code that checks it before granting it to plans.">
      {(close) => <NewFeatureForm close={close} />}
    </Dialog>
  );
}
