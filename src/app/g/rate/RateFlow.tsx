"use client";

import { groupHref } from "@/lib/paths";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, ChevronDown, Plus, ScanBarcode, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { gradeFromParts, gradeLabel, partsFromGrade, type Modifier } from "@/lib/grades";
import { duplicateKey, normalize, rankByRelevance } from "@/lib/search";
import { friendlyError, isUniqueViolation } from "@/lib/errors";
import { isServing } from "@/lib/servings";
import type { Beer, CatalogBeer, Rating, Serving } from "@/lib/types";
import { useGroup } from "@/components/GroupProvider";
import { GradePicker } from "@/components/GradePicker";
import { ServingPicker } from "@/components/ServingPicker";
import { BeerForm, draftToRow, draftValid, emptyDraft, type BeerDraft } from "@/components/BeerForm";
import { Button, Field, inputClass } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { lookupBarcode, type ProductSuggestion } from "@/lib/openFoodFacts";

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
  const [gradeTouched, setGradeTouched] = useState(false);
  const paramServing = params.get("serving");
  const [serving, setServing] = useState<Serving | null>(isServing(paramServing) ? paramServing : null);
  const [more, setMore] = useState(false);
  const [comment, setComment] = useState("");
  const [location, setLocation] = useState("");
  const [ratedOn, setRatedOn] = useState(today());
  const [saving, setSaving] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  // Zuletzt genutztes Gebinde vorauswählen (localStorage gibt es nur im Browser)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmalige Initialisierung aus localStorage
    if (!serving) setServing(readLastServing());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gewähltes Bier: aus der Gruppe oder aus dem gemeinsamen Katalog (noch von niemandem hier bewertet)
  const [picked, setPicked] = useState<Beer | null>(null);
  const beer = beerId ? (beerById.get(beerId) ?? (picked?.id === beerId ? picked : null)) : null;

  // Vorschläge (ab 2 Zeichen):
  //  a) Biere, die es schon gibt (z. B. aus anderen Gruppen), aber hier noch fehlen
  //  b) Einträge aus dem Bierkatalog (search_catalog: Trigram-Ähnlichkeit, Umlaute egal)
  const [catalogHits, setCatalogHits] = useState<Beer[]>([]);
  const [proposals, setProposals] = useState<CatalogBeer[]>([]);
  const [catalogPick, setCatalogPick] = useState<CatalogBeer | null>(null);
  useEffect(() => {
    // Sonderzeichen für den PostgREST-Filter entschärfen, Wert wird zusätzlich gequotet
    const q = query.trim().replace(/[%_,()*"\\]/g, " ").trim();
    if (q.length < 2) return; // Anzeige wird unten ausgeblendet
    const t = setTimeout(async () => {
      const supabase = createClient();
      const [{ data: beersFound }, { data: catalogFound }] = await Promise.all([
        supabase
          .from("beers")
          .select("*")
          .is("deleted_at", null)
          .or(`name.ilike."%${q}%",brewery.ilike."%${q}%"`)
          .order("name")
          .limit(8),
        supabase.rpc("search_catalog", { q: query.trim() }),
      ]);
      setCatalogHits((beersFound ?? []).filter((b) => !beerById.has(b.id)).slice(0, 4));
      setProposals(catalogFound ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [query, beerById]);
  const shownCatalog = useMemo(() => (query.trim().length >= 2 ? catalogHits : []), [query, catalogHits]);

  // Katalogeinträge ausblenden, die es als Bier schon gibt (gleiche catalog_id oder gleicher Name)
  const shownProposals = useMemo(() => {
    if (query.trim().length < 2) return [];
    const known = [...beers, ...shownCatalog];
    const ids = new Set(known.map((b) => b.catalog_id).filter(Boolean));
    const names = new Set(known.map((b) => normalize(b.name)));
    return proposals.filter((c) => !ids.has(c.id) && !names.has(normalize(c.name))).slice(0, 8);
  }, [proposals, beers, shownCatalog, query]);

  const existing: Rating | undefined = useMemo(
    () => ratings.find((r) => r.beer_id === beerId && r.user_id === me.id && r.serving === serving),
    [ratings, beerId, me.id, serving],
  );

  // Vorhandene eigene Bewertung (gleiches Bier + Gebinde) vorausfüllen
  const prefillKey = `${beerId}|${serving}|${existing?.id ?? ""}`;
  const [lastPrefill, setLastPrefill] = useState("");
  if (prefillKey !== lastPrefill) {
    setLastPrefill(prefillKey);
    // Nur vorausfüllen, was man in diesem Durchgang noch nicht selbst gesetzt hat
    if (existing) {
      if (!gradeTouched) {
        const parts = partsFromGrade(existing.grade);
        setBase(parts.base);
        setMod(parts.mod);
      }
      if (!comment) setComment(existing.comment ?? "");
      if (!location) setLocation(existing.location ?? "");
      if (ratedOn === today()) setRatedOn(existing.rated_on);
      if (existing.comment || existing.location) setMore(true);
    }
  }

  const suggestions = useMemo(() => {
    if (!query.trim()) return [...beers].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
    return rankByRelevance(beers, query).slice(0, 6);
  }, [beers, query]);

  const exactExists =
    query.trim() &&
    ([...beers, ...shownCatalog].some((b) => duplicateKey(b.name, b.brewery) === duplicateKey(query, "")) ||
      shownProposals.some((c) => normalize(c.name) === normalize(query)));

  const canSave =
    !!serving &&
    base !== null &&
    (beer !== null || catalogPick !== null || (draft !== null && draftValid(draft))) &&
    !saving;

  function startCreate() {
    setDraft(emptyDraft(query.trim()));
    setBeerId(null);
    setCatalogPick(null);
    setDupBeer(null);
  }

  function chooseBeer(id: string, fromCatalog?: Beer) {
    if (fromCatalog) setPicked(fromCatalog);
    setBeerId(id);
    setDraft(null);
    setCatalogPick(null);
    setDupBeer(null);
  }

  /** Vorschlag aus dem Katalog wählen – Name, Brauerei, Sorte, Land werden übernommen, weiter zur Note. */
  function chooseProposal(c: CatalogBeer) {
    setCatalogPick(c);
    setBeerId(null);
    setDraft(null);
    setDupBeer(null);
  }

  /** Bier zum Katalogeintrag finden oder anlegen (mit catalog_id). */
  async function ensureCatalogBeer(c: CatalogBeer): Promise<string | null> {
    const supabase = createClient();
    const { data: linked } = await supabase
      .from("beers")
      .select("id")
      .eq("catalog_id", c.id)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (linked) return linked.id;
    const { data, error } = await supabase
      .from("beers")
      .insert({
        name: c.name,
        brewery: c.brewery,
        style: c.style,
        country: c.country,
        catalog_id: c.id,
        created_by: me.id,
      })
      .select("id")
      .single();
    if (data) return data.id;
    if (isUniqueViolation(error)) {
      // Gleiches Bier wurde schon von Hand angelegt → das verwenden
      const { data: found } = await supabase
        .from("beers")
        .select("*")
        .is("deleted_at", null)
        .ilike("name", c.name.replace(/[%_]/g, "\\$&"));
      const match = (found ?? []).find((b) => duplicateKey(b.name, b.brewery) === duplicateKey(c.name, c.brewery));
      if (match) return match.id;
    }
    setSaving(false);
    toast({ message: friendlyError(error, "Das Bier konnte nicht angelegt werden."), tone: "error" });
    return null;
  }

  /** Legt das Bier aus dem Formular an. Bei Duplikat: Hinweis + null. */
  async function createBeerFromDraft(): Promise<string | null> {
    if (!draft) return null;
    const supabase = createClient();
    const row = draftToRow(draft);
    const local = beers.find((b) => duplicateKey(b.name, b.brewery) === duplicateKey(row.name, row.brewery));
    if (local) {
      setDupBeer(local);
      setSaving(false);
      return null;
    }
    const { data, error } = await supabase
      .from("beers")
      .insert({ ...row, created_by: me.id })
      .select()
      .single();
    if (error || !data) {
      setSaving(false);
      if (isUniqueViolation(error)) {
        await refresh();
        const { data: found } = await supabase
          .from("beers")
          .select("*")
          .is("deleted_at", null)
          .ilike("name", row.name.replace(/[%_]/g, "\\$&"));
        const match = (found ?? []).find((b) => duplicateKey(b.name, b.brewery) === duplicateKey(row.name, row.brewery));
        setDupBeer(match ?? null);
        if (!match) toast({ message: "Das Bier gibt es schon", tone: "error" });
        return null;
      }
      toast({ message: friendlyError(error), tone: "error" });
      return null;
    }
    return data.id;
  }

  /** Neues Bier nur merken („Will ich probieren“), ohne Note. */
  async function saveToWishlist() {
    if (saving || !(catalogPick || (draft && draftValid(draft)))) return;
    setSaving(true);
    const id = catalogPick ? await ensureCatalogBeer(catalogPick) : await createBeerFromDraft();
    if (!id) return;
    await createClient().from("wishlist").insert({ beer_id: id, user_id: me.id });
    await refresh();
    toast({ message: "Auf deine Wunschliste gesetzt 🔖" });
    router.push(groupHref(groupId!, "beer", { beer: id }));
  }

  /** Barcode gescannt: vorhandenes Bier wählen oder Daten von Open Food Facts holen. */
  const onScanned = useCallback(
    async (code: string) => {
      setScanOpen(false);
      const known = beers.find((b) => b.barcode === code);
      if (known) {
        chooseBeer(known.id);
        toast({ message: `Gefunden: ${known.name}` });
        return;
      }
      // Schon im gemeinsamen Katalog (z. B. aus einer anderen Gruppe)?
      const { data: inCatalog } = await createClient()
        .from("beers")
        .select("*")
        .eq("barcode", code)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();
      if (inCatalog) {
        chooseBeer(inCatalog.id, inCatalog);
        toast({ message: `Gefunden: ${inCatalog.name}` });
        return;
      }
      setLookingUp(true);
      let suggestion: ProductSuggestion | null = null;
      try {
        suggestion = await lookupBarcode(code);
      } catch {
        suggestion = null;
      }
      setLookingUp(false);
      setBeerId(null);
      setDupBeer(null);
      if (suggestion) {
        setDraft({ ...emptyDraft(), ...suggestion });
        toast({ message: "Daten von Open Food Facts übernommen – bitte kurz prüfen" });
      } else {
        setDraft({ ...emptyDraft(query.trim()), barcode: code });
        toast({ message: "Barcode nicht gefunden – bitte Namen eintragen" });
      }
    },
    [beers, query, toast],
  );

  async function save() {
    if (!canSave || !serving || base === null) return;
    setSaving(true);
    const supabase = createClient();
    let targetId = beer?.id ?? null;

    if (!targetId && catalogPick) {
      const id = await ensureCatalogBeer(catalogPick);
      if (!id) return;
      targetId = id;
    } else if (!targetId && draft) {
      const id = await createBeerFromDraft();
      if (!id) return;
      targetId = id;
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
    router.push(groupHref(groupId!, "beer", { beer: targetId }));
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
        ) : catalogPick ? (
          <div className="space-y-3 rounded-2xl border-2 border-accent bg-accent/10 p-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                🍺
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{catalogPick.name}</p>
                <p className="truncate text-sm text-muted">
                  {[catalogPick.brewery, catalogPick.style, catalogPick.country, catalogPick.alcohol_free && "alkoholfrei"]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <span className="mt-1 inline-block rounded-full bg-card px-2 py-0.5 text-xs font-semibold text-muted">
                  Vorschlag aus dem Bierkatalog
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCatalogPick(null)}
                aria-label="Anderes Bier wählen"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-card-2"
              >
                <X size={20} />
              </button>
            </div>
            <Button variant="secondary" className="w-full" disabled={saving} onClick={saveToWishlist}>
              <Bookmark size={18} aria-hidden /> Nur auf die Wunschliste (noch nicht probiert)
            </Button>
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
            <Button
              variant="secondary"
              className="w-full"
              disabled={!draftValid(draft) || saving}
              onClick={saveToWishlist}
            >
              <Bookmark size={18} aria-hidden /> Nur auf die Wunschliste (noch nicht probiert)
            </Button>
            {dupBeer && (
              <div className="rounded-2xl bg-card-2 p-3 text-sm" role="alert">
                <p className="font-bold">Das Bier gibt es schon.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button className="min-h-11" onClick={() => chooseBeer(dupBeer.id, dupBeer)}>
                    „{dupBeer.name}“ bewerten
                  </Button>
                  {beerById.has(dupBeer.id) && (
                    <Link
                      href={groupHref(groupId!, "beer", { beer: dupBeer.id })}
                      className="inline-flex min-h-11 items-center px-2 font-semibold underline"
                    >
                      Ansehen
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
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
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                disabled={lookingUp}
                aria-label="Barcode scannen"
                title="Barcode scannen"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-card hover:bg-card-2 disabled:opacity-50"
              >
                <ScanBarcode size={22} aria-hidden />
              </button>
            </div>
            {lookingUp && <p className="px-1 text-sm text-muted" role="status">Suche Produkt …</p>}
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
                    {query.trim() && (
                      <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent-strong">
                        in eurer Liste
                      </span>
                    )}
                  </button>
                </li>
              ))}
              {(shownCatalog.length > 0 || shownProposals.length > 0) && (
                <li className="px-1 pt-2 text-xs text-muted">Vorschläge</li>
              )}
              {shownCatalog.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => chooseBeer(b.id, b)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 text-left hover:bg-card-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{b.name}</span>
                      {(b.brewery || b.style) && (
                        <span className="block truncate text-sm text-muted">
                          {[b.brewery, b.style].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                    <ProposalTag />
                  </button>
                </li>
              ))}
              {shownProposals.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => chooseProposal(c)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 text-left hover:bg-card-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.name}</span>
                      <span className="block truncate text-sm text-muted">
                        {[c.brewery, c.style, c.alcohol_free && "alkoholfrei"].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <ProposalTag />
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
            setGradeTouched(true);
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
      {/* Bei jedem Öffnen frisch (Kamera, Eingabefeld) */}
      {scanOpen && <BarcodeScanner open onClose={() => setScanOpen(false)} onDetected={onScanned} />}
    </div>
  );
}

function ProposalTag() {
  return (
    <span className="shrink-0 rounded-full bg-card-2 px-2 py-0.5 text-xs font-semibold text-muted">Vorschlag</span>
  );
}
