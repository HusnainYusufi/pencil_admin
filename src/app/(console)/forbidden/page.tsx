import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/dal";
import { titleCase } from "@/lib/format";

export const metadata: Metadata = { title: "Not permitted" };

export default async function ForbiddenPage() {
  const admin = await requireAdmin();
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">403</p>
      <h1 className="mt-3 font-display text-[44px] leading-tight">
        <span className="mark">Not permitted</span>
      </h1>
      <p className="mt-3 text-ink-2">
        The {titleCase(admin.role)} role does not include access to this area. Ask a super admin if you need it.
      </p>
      <ButtonLink href="/" variant="secondary" className="mt-6">
        Back to overview
      </ButtonLink>
    </div>
  );
}
