"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { gradeFromParts, gradeLabel, partsFromGrade, type Modifier } from "@/lib/grades";
import { duplicateKey, rankByRelevance } from "@/lib/search";
import { friendlyError, isUniqueViolation } from "@/lib/errors";
import { isServing } from "@/lib/servings";
import type { Beer, Rating, Serving } from "@/lib/types";
import { useGroup } from "@/components/GroupProvider";
import { GradePicker } from "@/components/GradePicker";
import { ServingPicker } from "@/components/ServingPicker";
import { BeerForm, draftToRow, draftValid, emptyDraft, type BeerDraft } from "@/components/BeerForm";
import { Button, Field, inputClass } from "@/components/ui";
import { useToast } from "@/components/Toast";

const LAST_SERVING_KEY = "pz_last_serving";

function today() {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD in lokaler Zeit
}

function readLastServing(): Serving | null {
  try {
    const v = localStorage.getItem(LAST_SERVING_KEY);
    return isServing(v) ? v : null;
  } catch {
    return null;
  }
}

export function RateFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { groupId, beers, beerById, ratings, me, refresh, loading } = useGroup();

  const [beerId, setBeerId] = useState<string | null>(params.get("beer"));
  const [query, setQuery] = useState(params.get("name") ?? "");
  const [draft, setDraft] = useState<BeerDraft | null>(params.get("name") ? emptyDraft(params.get("name")!) : null);
  const [dupBeer, setDupBeer] = useState<Beer | null>(null);
  const [base, setBase] = useState<number | null>(null);
  const [mod, setMod] = useState<Modifier>("");
  const paramServing = params.get("serving");
  const [serving, setServing] = useState<Serving | null>(isServing(paramServing) ? paramServing : null);
  const [more, setMore] = useState(false);
  const [comment, setComment] = useState("");
  const [location, setLocation] = useState("");
  const [ratedOn, setRatedOn] = useState(today());
  const [saving, setSaving] = useState(false);

  // Zuletzt genutztes Gebinde vorauswählen (localStorage gibt es nur im Browser)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmalige Initialisierung aus localStorage
    if (!serving) setServing(readLastServing());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beer = beerId ? beerById.get(beerId) ?? null : null;

  const existing: Rating | undefined = useMemo(
    () => ratings.find((r) => r.beer_id === beerId && r.user_id === me.id && r.serving === serving),
    [ratings, beerId, me.id, serving],
  );

  // Vorhandene eigene Bewertung (gleiches Bier + Gebinde) vorausfüllen
  const prefillKey = `${beerId}|${serving}|${existing?.id ?? ""}`;
  const [lastPrefill, setLastPrefill] = useState("");
  if (prefillKey !== lastPrefill) {
    setLastPrefill(prefillKey);
    if (existing) {
      const parts = partsFromGrade(existing.grade);
      setBase(parts.base);
      setMod(parts.mod);
      setComment(existing.comment ?? "");
      setLocation(existing.location ?? "");
      setRatedOn(existing.rated_on);
      if (existing.comment || existing.location) setMore(true);
    }
  }

  const suggestions = useMemo(() => {
    if (!query.trim()) return [...beers].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
    return rankByRelevance(beers, query).slice(0, 6);
  }, [beers, query]);

  const exactExists = query.trim() && beers.some((b) => duplicateKey(b.name, b.brewery) === duplicateKey(query, ""));

  const canSave = !!serving && base !== null && (beer !== null || (draft !== null && draftValid(draft))) && !saving;

  function startCreate() {
    setDraft(emptyDraft(query.trim()));
    setBeerId(null);
    setDupBeer(null);
  }

  function chooseBeer(id: string) {
    setBeerId(id);
    setDraft(null);
    setDupBeer(null);
  }

  async function save() {
    if (!canSave || !serving || base === null) return;
    setSaving(true);
    const supabase = createClient();
    let targetId = beer?.id ?? null;

    if (!targetId && draft) {
      const row = draftToRow(draft);
      const local = beers.find((b) => duplicateKey(b.name, b.brewery) === duplicateKey(row.name, row.brewery));
      if (local) {
        setDupBeer(local);
        setSaving(false);
        return;
      }
      const { data, error } = await supabase
        .from("beers")
        .insert({ ...row, group_id: groupId!, created_by: me.id })
        .select()
        .single();
      if (error || !data) {
        setSaving(false);
        if (isUniqueViolation(error)) {
          await refresh();
          const { data: found } = await supabase
            .from("beers")
            .select("*")
            .eq("group_id", groupId!)
            .is("deleted_at", null)
            .ilike("name", row.name.replace(/[%_]/g, "\\$&"));
          const match = (found ?? []).find((b) => duplicateKey(b.name, b.brewery) === duplicateKey(row.name, row.brewery));
          setDupBeer(match ?? null);
          if (!match) toast({ message: "Das Bier gibt es schon", tone: "error" });
          return;
        }
        toast({ message: friendlyError(error), tone: "error" });
        return;
      }
      targetId = data.id;
    }

    const grade = gradeFromParts(base, mod);
    const previous = existing ? { ...existing } : null;
    const { data: saved, error } = await supabase
      .from("ratings")
      .upsert(
        {
          beer_id: targetId!,
          user_id: me.id,
          grade,
          serving,
          comment: comment.trim() || null,
          location: location.trim() || null,
          rated_on: ratedOn || today(),
          deleted_at: null,
        },
        { onConflict: "beer_id,user_id,serving" },
      )
      .select()
      .single();

    if (error || !saved) {
      setSaving(false);
      toast({ message: friendlyError(error, "Speichern fehlgeschlagen."), tone: "error" });
      if (!beer) await refresh();
      return;
    }

    try {
      localStorage.setItem(LAST_SERVING_KEY, serving);
    } catch {
      /* egal */
    }

    toast({
      message: `Gespeichert 🍻 (${gradeLabel(grade)})`,
      action: {
        label: "Rückgängig",
        onClick: async () => {
          const s = createClient();
          if (previous) {
            await s
              .from("ratings")
              .update({
                grade: previous.grade,
                comment: previous.comment,
                location: previous.location,
                rated_on: previous.rated_on,
                deleted_at: null,
              })
              .eq("id", saved.id);
          } else {
            await s.from("ratings").update({ deleted_at: new Date().toISOString() }).eq("id", saved.id);
          }
          await refresh();
          toast({ message: "Rückgängig gemacht" });
        },
      },
    });
    await refresh();
    router.push(`/g/${groupId}/beer/${targetId}`);
  }

  return (
    <div className="space-y-7 pb-24">
      <h1 className="text-2xl font-extrabold tracking-tight">Bier bewerten</h1>

      {/* 1. Welches Bier? */}
      <section aria-labelledby="sec-beer" className="space-y-3">
        <h2 id="sec-beer" className="text-sm font-bold tracking-wide text-muted uppercase">
          1 · Welches Bier?
        </h2>

        {beer ? (
          <div className="flex items-center gap-3 rounded-2xl border-2 border-accent bg-accent/10 p-3">
            <span className="text-3xl" aria-hidden>
              🍺
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold">{beer.name}</p>
              <p className="truncate text-sm text-muted">{[beer.brewery, beer.style].filter(Boolean).join(" · ") || "–"}</p>
            </div>
            <button
              type="button"
              onClick={() => setBeerId(null)}
              aria-label="Anderes Bier wählen"
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-card-2"
            >
              <X size={20} />
            </button>
          </div>
        ) : draft ? (
          <div className="space-y-3 rounded-2xl border-2 border-accent bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold">Neues Bier anlegen</p>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setDupBeer(null);
                }}
                aria-label="Neuanlage abbrechen"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-card-2"
              >
                <X size={20} />
              </button>
            </div>
            <BeerForm draft={draft} onChange={setDraft} />
            {dupBeer && (
              <div className="rounded-2xl bg-card-2 p-3 text-sm" role="alert">
                <p className="font-bold">Das Bier gibt es schon.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button className="min-h-11" onClick={() => chooseBeer(dupBeer.id)}>
                    „{dupBeer.name}“ bewerten
                  </Button>
                  <Link
                    href={`/g/${groupId}/beer/${dupBeer.id}`}
                    className="inline-flex min-h-11 items-center px-2 font-semibold underline"
                  >
                    Ansehen
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" size={20} aria-hidden />
              <input
                type="search"
                value={query}
                autoFocus={!params.get("beer")}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Bier suchen oder neu eingeben"
                aria-label="Bier suchen"
                className={`${inputClass} pl-11`}
              />
            </div>
            {!query.trim() && suggestions.length > 0 && <p className="px-1 text-xs text-muted">Zuletzt hinzugefügt</p>}
            <ul className="space-y-1.5">
              {loading && beers.length === 0 && <li className="px-1 text-sm text-muted">Lade Biere …</li>}
              {suggestions.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => chooseBeer(b.id)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-card px-4 text-left shadow-sm hover:bg-card-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{b.name}</span>
                      {(b.brewery || b.style) && (
                        <span className="block truncate text-sm text-muted">
                          {[b.brewery, b.style].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
              {query.trim() && !exactExists && (
                <li>
                  <button
                    type="button"
                    onClick={startCreate}
                    className="flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-dashed border-accent px-4 text-left font-bold"
                  >
                    <Plus size={20} aria-hidden /> „{query.trim()}“ neu anlegen
                  </button>
                </li>
              )}
              {!query.trim() && (
                <li>
                  <button
                    type="button"
                    onClick={startCreate}
                    className="flex min-h-12 w-full items-center gap-2 rounded-2xl px-4 text-left text-sm font-semibold text-muted"
                  >
                    <Plus size={18} aria-hidden /> Neues Bier anlegen
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </section>

      {/* 2. Note */}
      <section aria-labelledby="sec-grade" className="space-y-3">
        <h2 id="sec-grade" className="text-sm font-bold tracking-wide text-muted uppercase">
          2 · Note
        </h2>
        <GradePicker
          base={base}
          mod={mod}
          onChange={(b, m) => {
            setBase(b);
            setMod(m);
          }}
        />
      </section>

      {/* 3. Gebinde */}
      <section aria-labelledby="sec-serving" className="space-y-3">
        <h2 id="sec-serving" className="text-sm font-bold tracking-wide text-muted uppercase">
          3 · Gebinde
        </h2>
        <ServingPicker value={serving} onChange={setServing} />
        {existing && (
          <p className="rounded-2xl bg-accent/15 px-4 py-3 text-sm font-medium" role="status">
            Du hast das schon mit <strong>{gradeLabel(existing.grade)}</strong> bewertet – wird überschrieben.
          </p>
        )}
      </section>

      {/* 4. Optional */}
      <section>
        <button
          type="button"
          onClick={() => setMore(!more)}
          aria-expanded={more}
          className="flex min-h-12 w-full items-center justify-between rounded-2xl px-1 font-semibold text-muted"
        >
          Mehr hinzufügen (Kommentar, Ort, Datum)
          <ChevronDown className={`transition ${more ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {more && (
          <div className="mt-2 space-y-4">
            <Field label="Kommentar">
              <textarea
                className={`${inputClass} min-h-24 py-3`}
                value={comment}
                maxLength={500}
                placeholder="Wie war's?"
                onChange={(e) => setComment(e.target.value)}
              />
            </Field>
            <Field label="Ort / Bar">
              <input className={inputClass} value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)} />
            </Field>
            <Field label="Datum">
              <input
                type="date"
                className={inputClass}
                value={ratedOn}
                max={today()}
                onChange={(e) => setRatedOn(e.target.value)}
              />
            </Field>
          </div>
        )}
      </section>

      {/* 5. Speichern – fixiert über der Navigation */}
      <div
        className="fixed inset-x-0 z-20 px-4"
        style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-[608px]">
          <Button className="h-14 w-full text-lg shadow-xl" disabled={!canSave} onClick={save}>
            {saving ? "Speichere …" : "Speichern"}
          </Button>
        </div>
      </div>
    </div>
  );
}
