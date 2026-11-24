"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { Button } from "@/components/ui";

export function JoinButton({ code, auto }: { code: string; auto: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const join = useCallback(async () => {
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("join_group", { p_code: code });
    if (error || !data) {
      setBusy(false);
      setError(friendlyError(error));
      return;
    }
    router.replace(`/g/${data}`);
    router.refresh();
  }, [code, router]);

  // Nach dem Login automatisch beitreten.
  useEffect(() => {
    if (auto && !started.current) {
      started.current = true;
      void join();
    }
  }, [auto, join]);

  return (
    <>
      <Button className="w-full" onClick={join} disabled={busy}>
        {busy ? "Trete bei …" : "Beitreten 🍺"}
      </Button>
      {error && (
        <p className="mt-3 text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
