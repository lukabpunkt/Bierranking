import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { safeNext } from "@/lib/errors";
import { ProfileForm } from "@/components/ProfileForm";

export const metadata = { title: "Willkommen · Prost-Zeugnis" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const { profile } = await requireUser({ allowNotOnboarded: true });
  const target = safeNext(next, "/");
  if (profile.onboarded) redirect(target);

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
