import { LogOut, Menu } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { NavLinks, type NavItem } from "@/components/shell/nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/dal";
import { env } from "@/lib/env";
import { titleCase } from "@/lib/format";
import { hasPermission, Perm } from "@/lib/permissions";
import { THEME_COOKIE } from "@/lib/theme";
import { logout } from "../login/actions";

const ENVIRONMENT_STYLE = {
  local: "border-line text-muted",
  staging: "border-warning/40 bg-warning-bg text-warning",
  production: "border-danger/40 bg-danger-bg text-danger",
} as const;

export default async function ConsoleLayout({ children }: LayoutProps<"/">) {
  const admin = await requireAdmin();
  const theme = (await cookies()).get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  const can = (permission: string) => hasPermission(admin.permissions, permission);

  const nav: NavItem[] = [
    { href: "/", label: "Overview", icon: "overview" },
    ...(can(Perm.TENANTS_READ) ? [{ href: "/tenants", label: "Tenants", icon: "tenants" } as const] : []),
    ...(can(Perm.CATALOG_READ)
      ? [
          { href: "/plans", label: "Plans", icon: "plans" } as const,
          { href: "/features", label: "Features", icon: "features" } as const,
        ]
      : []),
    ...(can(Perm.AUDIT_READ) ? [{ href: "/audit", label: "Audit log", icon: "audit" } as const] : []),
  ];

  const initials = admin.fullName
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <nav aria-label="Main" className="flex h-full flex-col">
      <Link href="/" className="mb-8 flex items-baseline gap-2 px-3">
        <span className="font-display text-[30px] leading-none tracking-[-0.02em]">Pencil</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Platform</span>
      </Link>
      <NavLinks items={nav} />
      <div className="mt-auto space-y-3 px-3 pt-8">
        <p className="font-mono text-[10.5px] uppercase leading-relaxed tracking-[0.12em] text-muted">
          Signed in as
          <br />
          <span className="text-ink-2">{titleCase(admin.role)}</span>
        </p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Border/background on the full-height column; the nav itself stays pinned. */}
      <div className="hidden border-r border-line bg-surface/60 lg:block">
        <aside className="sticky top-0 h-dvh px-3 py-6">{sidebar}</aside>
      </div>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-8">
          {/* Mobile navigation: native <details>, works without JavaScript. */}
          <details className="relative lg:hidden">
            <summary className="flex size-9 cursor-pointer list-none items-center justify-center rounded-md hover:bg-surface-2">
              <Menu className="size-4" aria-hidden />
              <span className="sr-only">Open navigation</span>
            </summary>
            <div className="absolute left-0 top-11 w-64 rounded-lg border border-line bg-surface p-3 shadow-card">{sidebar}</div>
          </details>
          <Link href="/" className="font-display text-2xl lg:hidden">
            Pencil
          </Link>

          <span
            className={cn(
              "ml-auto hidden items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] sm:inline-flex",
              ENVIRONMENT_STYLE[env.environment],
            )}
          >
            <span aria-hidden className="size-1.5 rounded-full bg-current" />
            {env.environment}
          </span>
          <span className="ml-auto sm:ml-0" />
          <ThemeToggle initial={theme} />
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-md py-1 pl-1 pr-2 hover:bg-surface-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-accent font-mono text-[11px] font-medium text-accent-ink">
                {initials}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-[13px] font-medium">{admin.fullName}</span>
                <span className="block text-[11.5px] text-muted">{admin.email}</span>
              </span>
            </summary>
            <div className="absolute right-0 top-12 w-56 rounded-lg border border-line bg-surface p-1.5 shadow-card">
              <form action={logout}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink"
                >
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </header>

        <main className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
