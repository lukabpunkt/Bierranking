"use client";

import { groupHref } from "@/lib/paths";
import Link from "next/link";
import { Eye, EyeOff, Settings } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { GroupSwitcher } from "./GroupSwitcher";
import { useGroup } from "./GroupProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { groupId, hideGrades, setHideGrades } = useGroup();
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[640px] items-center justify-between gap-2 px-4">
          <GroupSwitcher />
          {groupId && (
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                onClick={() => setHideGrades(!hideGrades)}
                aria-pressed={hideGrades}
                aria-label={hideGrades ? "Noten sind verdeckt – Noten anzeigen" : "Noten verdecken"}
                title={hideGrades ? "Noten verdeckt" : "Noten sichtbar"}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-card-2 ${
                  hideGrades ? "text-accent-strong" : "text-muted"
                }`}
              >
                {hideGrades ? <EyeOff size={22} aria-hidden /> : <Eye size={22} aria-hidden />}
              </button>
              <Link
                href={groupHref(groupId, "settings")}
                aria-label="Gruppeneinstellungen"
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition hover:bg-card-2"
              >
                <Settings size={22} aria-hidden />
              </Link>
            </div>
          )}
        </div>
      </header>
      <main className="pb-nav mx-auto w-full max-w-[640px] px-4 pt-4">{children}</main>
      <BottomNav />
    </>
  );
}
