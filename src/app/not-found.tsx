import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-6xl" aria-hidden>
        🫗
      </div>
      <h1 className="text-2xl font-extrabold">Nichts gefunden</h1>
      <p className="text-muted">Diese Seite gibt es nicht – oder du bist (noch) kein Mitglied dieser Gruppe.</p>
      <ButtonLink href="/groups" className="mt-3">
        Zu meinen Gruppen
      </ButtonLink>
    </main>
  );
}
