import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { SkeletonBlock } from "@/components/Skeleton";

export const metadata = { title: "Anmelden · Prost-Zeugnis" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[640px] flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mb-3 text-6xl" aria-hidden>
          🍺
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Prost-Zeugnis</h1>
        <p className="mt-2 text-muted">Biere bewerten wie früher in der Schule – von 1+ bis 6.</p>
      </div>
      <Suspense fallback={<SkeletonBlock className="h-[22rem]" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
