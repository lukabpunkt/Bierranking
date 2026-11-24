"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { groupHref } from "@/lib/paths";
import { useSession } from "@/components/SessionProvider";
import { Card, ButtonLink } from "@/components/ui";
import { SkeletonBlock } from "@/components/Skeleton";
import { JoinButton } from "./JoinButton";

type Preview = { id: string; name: string; member_count: number } | null;

/** Öffentliche Einladungsseite: /join/?code=… */
function Join() {
  const router = useRouter();
  const params = useSearchParams();
  const code = (params.get("code") ?? "").trim().toLowerCase();
  const auto = params.get("auto") === "1";
  const session = useSession();
  const [preview, setPreview] = useState<Preview | undefined>(undefined);

  useEffect(() => {
    if (!code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ohne Code gibt es nichts zu laden
      setPreview(null);
      return;
    }
    createClient()
      .rpc("group_preview", { p_code: code })
      .then(({ data }) => setPreview(data?.[0] ?? null));
  }, [code]);

  const self = `/join/?code=${encodeURIComponent(code)}&auto=1`;
  const isMember = !!preview && session.status === "in" && session.groups.some((g) => g.id === preview.id);
  const needsOnboarding = !!preview && session.status === "in" && !session.profile.onboarded;

  useEffect(() => {
    if (isMember) router.replace(groupHref(preview!.id));
    else if (needsOnboarding) router.replace(`/onboarding/?next=${encodeURIComponent(self)}`);
  }, [isMember, needsOnboarding, preview, router, self]);

  if (preview === undefined || session.status === "loading") {
    return <SkeletonBlock className="h-64" />;
  }

  if (!preview) {
    return (
      <Card className="text-center">
        <div className="mb-3 text-5xl" aria-hidden>
          🤷
        </div>
        <h1 className="text-2xl font-extrabold">Einladung ungültig</h1>
        <p className="mt-2 text-muted">Dieser Link funktioniert nicht (mehr). Frag nach einem neuen Einladungslink.</p>
        <ButtonLink href="/" variant="secondary" className="mt-6 w-full">
          Zur Startseite
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card className="text-center">
      <div className="mb-3 text-6xl" aria-hidden>
        🍻
      </div>
      <p className="text-muted">Du wurdest eingeladen zu</p>
      <h1 className="mt-1 text-3xl font-extrabold tracking-tight">„{preview.name}“</h1>
      <p className="mt-2 text-muted">
        {preview.member_count} {Number(preview.member_count) === 1 ? "Mitglied" : "Mitglieder"}
      </p>
      <div className="mt-6">
        {session.status === "in" ? (
          !isMember && !needsOnboarding && <JoinButton code={code} auto={auto} />
        ) : (
          <ButtonLink href={`/login/?next=${encodeURIComponent(self)}`} className="w-full">
            Anmelden &amp; beitreten
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}

export default function JoinPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col justify-center px-5 py-10">
      <Suspense>
        <Join />
      </Suspense>
    </main>
  );
}
