"use client";

import { useCallback, useEffect, useState } from "react";

function read(key: string): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function write(key: string, value: string[]) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* privater Modus o. Ä. – dann eben nur im Speicher */
  }
}

/**
 * Merkt sich pro Gruppe, welche Biere in dieser Sitzung aufgedeckt wurden (sessionStorage).
 * `"*"` steht für „Alle aufdecken“.
 */
export function useRevealed(groupId: string | null) {
  const key = `pz_revealed_${groupId ?? "none"}`;
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [justRevealed, setJustRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage ist erst im Browser verfügbar
    setRevealed(new Set(read(key)));
  }, [key]);

  const reveal = useCallback(
    (id: string) => {
      setRevealed((prev) => {
        const next = new Set(prev).add(id);
        write(key, [...next]);
        return next;
      });
      setJustRevealed((prev) => new Set(prev).add(id));
    },
    [key],
  );

  const revealAll = useCallback(() => reveal("*"), [reveal]);

  const hideAgain = useCallback(() => {
    setRevealed(new Set());
    setJustRevealed(new Set());
    write(key, []);
  }, [key]);

  const isRevealed = useCallback((id: string) => revealed.has("*") || revealed.has(id), [revealed]);
  const wasJustRevealed = useCallback(
    (id: string) => justRevealed.has(id) || justRevealed.has("*"),
    [justRevealed],
  );

  return { isRevealed, reveal, revealAll, hideAgain, allRevealed: revealed.has("*"), wasJustRevealed };
}
