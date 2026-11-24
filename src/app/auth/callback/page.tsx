"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/errors";
import { useSession } from "@/components/SessionProvider";

/** Ziel des Magic Links: tauscht den Code gegen eine Session und springt zum Ziel. */
function Callback() {
  const router = useRouter();
  const params = useSearchParams();
  const { reload } = useSession();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type") as EmailOtpType | null;
    const next = safeNext(params.get("next"));
    const supabase = createClient();

    (async () => {
      let ok = false;
      if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
      else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
      else ok = !!(await supabase.auth.getSession()).data.session;

      if (!ok) {
        const q = new URLSearchParams({ error: "link" });
        if (next !== "/") q.set("next", next);
        router.replace(`/login/?${q.toString()}`);
        return;
      }
      await reload();
      router.replace(next);
    })();
  }, [params, router, reload]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center">
      <div className="anim-pop text-5xl" aria-hidden>
        🍺
      </div>
      <p className="font-semibold text-muted">Du wirst angemeldet …</p>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <Callback />
    </Suspense>
  );
}
