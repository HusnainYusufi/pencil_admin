import Link from "next/link";
import { buttonClass } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <main className="ruled flex min-h-dvh items-center justify-center px-6">
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">404</p>
        <h1 className="mt-3 font-display text-[52px] leading-tight">
          <span className="mark">Not on the ledger</span>
        </h1>
        <p className="mt-3 text-ink-2">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
        <Link href="/" className={buttonClass("secondary", "md", "mt-6")}>
          Back to overview
        </Link>
      </div>
    </main>
  );
}
