"use client";

import type { Badge } from "@/lib/badges";

export function BadgeGrid({ badges }: { badges: Badge[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {[...badges]
        .sort((a, b) => Number(b.earned) - Number(a.earned) || b.progress - a.progress)
        .map((b) => (
          <li
            key={b.id}
            className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-center ${
              b.earned ? "bg-accent/15 ring-1 ring-accent/40" : "bg-card"
            }`}
          >
            <span className={`text-3xl ${b.earned ? "" : "opacity-35 grayscale"}`} aria-hidden>
              {b.icon}
            </span>
            <span className="text-sm leading-tight font-bold">{b.title}</span>
            <span className="text-xs leading-snug text-muted">{b.description}</span>
            {!b.earned && b.progressLabel && (
              <span className="mt-1 w-full">
                <span className="block h-1.5 overflow-hidden rounded-full bg-card-2">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${b.progress * 100}%` }} />
                </span>
                <span className="tabular text-[11px] text-muted">{b.progressLabel}</span>
              </span>
            )}
            <span className="sr-only">{b.earned ? "erreicht" : "noch nicht erreicht"}</span>
          </li>
        ))}
    </ul>
  );
}
