"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { GroupProvider } from "@/components/GroupProvider";
import { AppShell } from "@/components/AppShell";
import { SkeletonList } from "@/components/Skeleton";
import { ButtonLink } from "@/components/ui";
import type { MyGroup } from "@/components/SessionProvider";

function NoAccess() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-6xl" aria-hidden>
        🫗
      </div>
      <h1 className="text-2xl font-extrabold">Gruppe nicht gefunden</h1>
      <p className="text-muted">Diese Gruppe gibt es nicht – oder du bist (noch) kein Mitglied.</p>
      <ButtonLink href="/groups/" className="mt-3">
        Zu meinen Gruppen
      </ButtonLink>
    </main>
  );
}

function Gate({ groups, children }: { groups: MyGroup[]; children: React.ReactNode }) {
  const id = useSearchParams().get("id");
  const group = groups.find((g) => g.id === id);
  if (!group) return <NoAccess />;
  return (
    // key: beim Gruppenwechsel alles frisch laden
    <GroupProvider key={group.id} group={group}>
      <AppShell>{children}</AppShell>
    </GroupProvider>
  );
}

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SkeletonList count={4} />}>
      <RequireAuth>{({ groups }) => <Gate groups={groups}>{children}</Gate>}</RequireAuth>
    </Suspense>
  );
}
