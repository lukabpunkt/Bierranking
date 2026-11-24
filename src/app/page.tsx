"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { SkeletonList } from "@/components/Skeleton";
import { lastGroup } from "@/lib/lastGroup";
import { groupHref } from "@/lib/paths";
import type { MyGroup } from "@/components/SessionProvider";

function Redirect({ groups }: { groups: MyGroup[] }) {
  const router = useRouter();
  useEffect(() => {
    if (groups.length === 0) return router.replace("/groups/");
    const last = lastGroup();
    const target = groups.find((g) => g.id === last) ?? groups[0];
    router.replace(groupHref(target.id));
  }, [groups, router]);
  return null;
}

/** Startseite: direkt in die zuletzt genutzte Gruppe springen. */
export default function Home() {
  return (
    <Suspense fallback={<SkeletonList count={3} />}>
      <RequireAuth>{({ groups }) => <Redirect groups={groups} />}</RequireAuth>
    </Suspense>
  );
}
