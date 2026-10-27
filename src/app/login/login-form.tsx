"use client";

import { FormMessage, SubmitButton, useActionForm } from "@/components/ui/interactive";
import { Field, Input } from "@/components/ui/primitives";
import { login } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const { state, pending, onSubmit, errors } = useActionForm(login);

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage tone="danger">{state.error}</FormMessage>
      <Field label="Work email" htmlFor="email" error={errors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoFocus
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Signing in…" pending={pending}>
        Sign in
      </SubmitButton>
    </form>
  );
}
