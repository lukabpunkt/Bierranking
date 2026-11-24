import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, ButtonLink } from "@/components/ui";
import { JoinButton } from "./JoinButton";

export const metadata = { title: "Einladung · Prost-Zeugnis" };

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const { code } = await params;
  const { auto } = await searchParams;
  const supabase = await createClient();

  const [{ data: preview }, { data: userData }] = await Promise.all([
    supabase.rpc("group_preview", { p_code: code }),
    supabase.auth.getUser(),
  ]);
  const group = preview?.[0];
  const user = userData.user;
  const self = `/join/${encodeURIComponent(code)}?auto=1`;

  if (group && user) {
    const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", user.id).single();
    if (profile && !profile.onboarded) redirect(`/onboarding?next=${encodeURIComponent(self)}`);
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (membership) redirect(`/g/${group.id}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col justify-center px-5 py-10">
      {group ? (
        <Card className="text-center">
          <div className="mb-3 text-6xl" aria-hidden>
            🍻
          </div>
          <p className="text-muted">Du wurdest eingeladen zu</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">„{group.name}“</h1>
          <p className="mt-2 text-muted">
            {group.member_count} {Number(group.member_count) === 1 ? "Mitglied" : "Mitglieder"}
          </p>
          <div className="mt-6">
            {user ? (
              <JoinButton code={code} auto={auto === "1"} />
            ) : (
              <ButtonLink href={`/login?next=${encodeURIComponent(self)}`} className="w-full">
                Anmelden &amp; beitreten
              </ButtonLink>
            )}
          </div>
        </Card>
      ) : (
        <Card className="text-center">
          <div className="mb-3 text-5xl" aria-hidden>
            🤷
          </div>
          <h1 className="text-2xl font-extrabold">Einladung ungültig</h1>
          <p className="mt-2 text-muted">
            Dieser Link funktioniert nicht (mehr). Frag nach einem neuen Einladungslink.
          </p>
          <ButtonLink href="/" variant="secondary" className="mt-6 w-full">
            Zur Startseite
          </ButtonLink>
        </Card>
      )}
    </main>
  );
}
