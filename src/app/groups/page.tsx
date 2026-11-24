"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";
import { GroupsClient } from "./GroupsClient";

function Groups() {
  const focusNew = useSearchParams().get("new") === "1";
  return (
    <RequireAuth>{({ groups, profile }) => <GroupsClient groups={groups} profile={profile} focusNew={focusNew} />}</RequireAuth>
  );
}

export default function GroupsPage() {
  return (
    <Suspense>
      <Groups />
    </Suspense>
  );
}
