"use client";

import { Suspense } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { GroupProvider } from "@/components/GroupProvider";
import { AppShell } from "@/components/AppShell";
import { lastGroup } from "@/lib/lastGroup";
import { MeClient } from "./MeClient";

export default function MePage() {
  return (
    <Suspense>
      <RequireAuth>
        {({ groups, user }) => {
          const last = lastGroup();
          const current = groups.find((g) => g.id === last) ?? groups[0] ?? null;
          return (
            <GroupProvider key={current?.id ?? "none"} group={current}>
              <AppShell>
                <MeClient email={user.email ?? ""} />
              </AppShell>
            </GroupProvider>
          );
        }}
      </RequireAuth>
    </Suspense>
  );
}
