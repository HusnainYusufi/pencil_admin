"use client";

import { Button } from "@/components/ui/primitives";

/** Errors never leak internals: a calm message plus the digest for support. */
export default function ConsoleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Error</p>
      <h1 className="mt-3 font-display text-[44px] leading-tight">
        <span className="mark">Something went wrong</span>
      </h1>
      <p className="mt-3 text-ink-2">The page could not be loaded. Try again; if it persists, share the reference below.</p>
      {error.digest && <p className="mt-4 font-mono text-[12px] text-muted">ref {error.digest}</p>}
      <Button className="mt-6" variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
