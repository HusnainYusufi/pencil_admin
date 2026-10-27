import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const REASONS: Record<string, string> = {
  idle: "You were signed out after a period of inactivity.",
  expired: "Your session expired. Please sign in again.",
  "signed-out": "You have been signed out.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const reason = typeof params.reason === "string" ? REASONS[params.reason] : undefined;
  const next = typeof params.next === "string" ? params.next : "/";

  return (
    <main className="ruled grid min-h-dvh lg:grid-cols-[1.15fr_1fr]">
      {/* Ledger side: the brand moment, deliberately quiet. */}
      <section className="relative hidden flex-col justify-between px-20 py-14 lg:flex">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Platform console</p>
        <div>
          <h1 className="font-display text-[clamp(5rem,9vw,8.5rem)] leading-[0.85] tracking-[-0.03em] text-ink">
            <span className="mark">Pencil</span>
          </h1>
          <p className="mt-8 max-w-md font-display text-[28px] italic leading-snug text-ink-2">
            Every company, plan and change on one clear ledger.
          </p>
        </div>
        <ul className="flex gap-8 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          <li>Saudi Arabia · ZATCA</li>
          <li>Jordan · JoFotara</li>
        </ul>
      </section>

      {/* Sign-in card */}
      <section className="flex items-center justify-center px-5 py-12 lg:border-l lg:border-line lg:bg-bg/80">
        <div className="w-full max-w-[400px]">
          <h1 className="mb-1 font-display text-5xl lg:hidden">
            <span className="mark">Pencil</span>
          </h1>
          <div className="rounded-xl border border-line bg-surface p-8 shadow-card">
            <h2 className="font-display text-[32px] leading-tight">Sign in</h2>
            <p className="mt-1 text-ink-2">Staff access only. Every action is audited.</p>
            {reason && (
              <p role="status" className="mt-5 rounded-md bg-accent-soft px-3 py-2 text-[13px] text-accent-ink">
                {reason}
              </p>
            )}
            <LoginForm next={next} />
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-[12.5px] text-muted">
            <ShieldCheck className="size-3.5" aria-hidden />
            Encrypted session · idle sign-out · lockout after repeated failures
          </p>
        </div>
      </section>
    </main>
  );
}
