"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { safeNext } from "@/lib/errors";
import { RequireAuth } from "@/components/RequireAuth";
import { ProfileForm } from "@/components/ProfileForm";
import type { Profile } from "@/lib/types";

function Onboarding({ profile }: { profile: Profile }) {
  const router = useRouter();
  const target = safeNext(useSearchParams().get("next"), "/");

  useEffect(() => {
    if (profile.onboarded) router.replace(target);
  }, [profile.onboarded, router, target]);

  return (
    <main className="mx-auto min-h-dvh max-w-[640px] px-5 py-10">
      <div className="mb-6">
        <div className="mb-2 text-5xl" aria-hidden>
          👋
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Willkommen!</h1>
        <p className="mt-1 text-muted">Wie sollen dich die anderen sehen?</p>
      </div>
      <ProfileForm profile={profile} onboarding redirectTo={target} />
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <RequireAuth allowNotOnboarded>{({ profile }) => <Onboarding profile={profile} />}</RequireAuth>
    </Suspense>
  );
}
