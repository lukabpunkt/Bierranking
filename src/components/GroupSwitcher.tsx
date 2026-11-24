"use client";

import { groupHref } from "@/lib/paths";
import Link from "next/link";
import { useState } from "react";
import { Check, ChevronDown, Plus, Users } from "lucide-react";
import { useGroup } from "./GroupProvider";
import { BottomSheet } from "./BottomSheet";

export function GroupSwitcher() {
  const { group, groups } = useGroup();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-xl pr-2 text-left"
        aria-haspopup="dialog"
        aria-label={`Gruppe wechseln, aktuell: ${group?.name ?? "keine"}`}
      >
        <span className="truncate text-xl font-extrabold tracking-tight">{group?.name ?? "Keine Gruppe"}</span>
        <ChevronDown size={20} className="shrink-0 text-muted" aria-hidden />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Gruppe wechseln">
        <ul className="space-y-2">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={groupHref(g.id)}
                onClick={() => setOpen(false)}
                className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 ${
                  g.id === group?.id ? "bg-accent/15" : "bg-card-2 hover:brightness-[0.98]"
                }`}
              >
                <span className="text-xl" aria-hidden>
                  🍻
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{g.name}</span>
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <Users size={13} aria-hidden /> {g.member_count}
                  </span>
                </span>
                {g.id === group?.id && <Check className="text-accent-strong" aria-label="aktuell" />}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/groups/?new=1"
              onClick={() => setOpen(false)}
              className="flex min-h-14 items-center gap-3 rounded-2xl border-2 border-dashed border-line px-4 font-bold"
            >
              <Plus aria-hidden /> Neue Gruppe / Beitreten
            </Link>
          </li>
        </ul>
      </BottomSheet>
    </>
  );
}
