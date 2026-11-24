"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types";
import { useSession, type MyGroup } from "./SessionProvider";
import { SkeletonList } from "./Skeleton";

/**
 * Schützt eine Seite: ohne Login → /login?next=…, ohne Onboarding → /onboarding?next=….
 * Rendert die Kinder erst, wenn alles passt.
 */
export function RequireAuth({
  children,
  allowNotOnboarded = false,
}: {
  children: (s: { user: User; profile: Profile; groups: MyGroup[] }) => React.ReactNode;
  allowNotOnboarded?: boolean;
}) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qs = params.toString();
  const here = pathname + (qs ? `?${qs}` : "");

  const needsLogin = session.status === "out";
  const needsOnboarding = session.status === "in" && !session.profile.onboarded && !allowNotOnboarded;

  useEffect(() => {
    if (needsLogin) router.replace(here === "/" ? "/login/" : `/login/?next=${encodeURIComponent(here)}`);
    else if (needsOnboarding) router.replace(`/onboarding/?next=${encodeURIComponent(here)}`);
  }, [needsLogin, needsOnboarding, here, router]);

  if (session.status !== "in" || needsOnboarding) {
    return (
      <div className="mx-auto max-w-[640px] px-4 pt-20">
        <SkeletonList count={3} />
      </div>
    );
  }
  return <>{children({ user: session.user, profile: session.profile, groups: session.groups })}</>;
}
