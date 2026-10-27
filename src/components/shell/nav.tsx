"use client";

import { Building2, Layers, LayoutGrid, ScrollText, ToggleRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/primitives";

export interface NavItem {
  href: string;
  label: string;
  icon: "overview" | "tenants" | "plans" | "features" | "audit";
}

const ICONS: Record<NavItem["icon"], LucideIcon> = {
  overview: LayoutGrid,
  tenants: Building2,
  plans: Layers,
  features: ToggleRight,
  audit: ScrollText,
};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = ICONS[item.icon];
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] transition-colors duration-150",
                active ? "font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className={cn("size-4 shrink-0", active ? "text-ink" : "text-muted group-hover:text-ink-2")} aria-hidden />
              <span className={cn(active && "mark")}>{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
