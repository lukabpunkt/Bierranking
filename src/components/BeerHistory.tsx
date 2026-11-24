"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/database.types";
import { useGroup } from "./GroupProvider";
import { Avatar } from "./Avatar";
import { SkeletonBlock } from "./Skeleton";

type Entry = { id: number; changed_at: string; changed_by: string | null; old_data: Json; new_data: Json };

const FIELDS: Record<string, string> = {
  name: "Name",
  brewery: "Brauerei",
  style: "Sorte",
  abv: "Alkohol %",
  country: "Land",
  deleted_at: "Gelöscht",
};

function show(key: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "–";
  if (key === "deleted_at") return "ja";
  return String(v);
}

export function BeerHistory({ beerId }: { beerId: string }) {
  const { profileOf } = useGroup();
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    createClient()
      .from("beer_history")
      .select("id, changed_at, changed_by, old_data, new_data")
      .eq("beer_id", beerId)
      .order("changed_at", { ascending: false })
      .then(({ data }) => setEntries(data ?? []));
  }, [beerId]);

  if (!entries) return <SkeletonBlock className="h-24" />;
  if (entries.length === 0) return <p className="pb-4 text-muted">Noch keine Änderungen.</p>;

  return (
    <ul className="space-y-3 pb-2">
      {entries.map((e) => {
        const oldD = (e.old_data ?? {}) as Record<string, unknown>;
        const newD = (e.new_data ?? {}) as Record<string, unknown>;
        const changes = Object.keys(FIELDS).filter((k) => JSON.stringify(oldD[k]) !== JSON.stringify(newD[k]));
        const who = e.changed_by ? profileOf(e.changed_by) : null;
        return (
          <li key={e.id} className="rounded-2xl bg-card-2 p-3">
            <p className="mb-1 flex items-center gap-2 text-sm text-muted">
              {who && <Avatar profile={who} size="xs" />}
              {who?.display_name ?? "Unbekannt"} ·{" "}
              {new Date(e.changed_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
            </p>
            <ul className="space-y-0.5 text-[15px]">
              {changes.length === 0 && <li className="text-muted">Interne Änderung</li>}
              {changes.map((k) =>
                k === "deleted_at" ? (
                  <li key={k}>{newD[k] ? "🗑️ gelöscht" : "♻️ wiederhergestellt"}</li>
                ) : (
                  <li key={k}>
                    <span className="font-semibold">{FIELDS[k]}:</span>{" "}
                    <span className="text-muted line-through">{show(k, oldD[k])}</span> → {show(k, newD[k])}
                  </li>
                ),
              )}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
