"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Beer, Plus, Scale, User, type LucideIcon } from "lucide-react";
import { useGroup } from "./GroupProvider";
import { groupHref, normalizePath } from "@/lib/paths";

type NavItem = { href: string; label: string; icon: LucideIcon; active: boolean };

function NavLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={item.active ? "page" : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold transition ${
        item.active ? "text-accent-strong" : "text-muted hover:text-fg"
      }`}
    >
      <Icon size={24} strokeWidth={item.active ? 2.6 : 2} aria-hidden />
      {item.label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = normalizePath(usePathname());
  const { groupId } = useGroup();

  const beers: NavItem = {
    href: groupId ? groupHref(groupId) : "/groups/",
    label: "Biere",
    icon: Beer,
    active: groupId ? pathname === "/g" || pathname === "/g/beer" : pathname === "/groups",
  };
  const compare: NavItem = {
    href: groupId ? groupHref(groupId, "compare") : "/groups/",
    label: "Vergleich",
    icon: Scale,
    active: pathname === "/g/compare",
  };
  const me: NavItem = { href: "/me/", label: "Ich", icon: User, active: pathname === "/me" };

  const rateHref = groupId ? groupHref(groupId, "rate") : "/groups/";
  const rateActive = pathname === "/g/rate";

  return (
    <nav
      aria-label="Hauptnavigation"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-[640px] items-center gap-1 px-2 py-1.5">
        <NavLink item={beers} />
        <Link
          href={rateHref}
          aria-current={rateActive ? "page" : undefined}
          className="flex min-h-14 flex-[1.25] flex-col items-center justify-center"
        >
          <span
            className={`-mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg ring-4 ring-bg transition active:scale-95 ${
              rateActive ? "brightness-95" : ""
            }`}
          >
            <Plus size={34} strokeWidth={2.8} aria-hidden />
          </span>
          <span className={`mt-0.5 text-xs font-bold ${rateActive ? "text-accent-strong" : "text-fg"}`}>Bewerten</span>
        </Link>
        <NavLink item={compare} />
        <NavLink item={me} />
      </div>
    </nav>
  );
}
