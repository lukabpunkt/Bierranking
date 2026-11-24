"use client";

import { groupHref } from "@/lib/paths";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Eye, Info, Search, SlidersHorizontal, X } from "lucide-react";
import { filterAndSort, SORTS, type ListFilters, type SortKey } from "@/lib/beerList";
import { isServing, SERVINGS } from "@/lib/servings";
import type { Serving } from "@/lib/types";
import { useGroup } from "./GroupProvider";
import { BeerCard } from "./BeerCard";
import { BottomSheet } from "./BottomSheet";
import { SkeletonList } from "./Skeleton";
import { Avatar } from "./Avatar";
import { ButtonLink, Chip, EmptyState, Button } from "./ui";

function parseFilters(params: URLSearchParams): ListFilters {
  const sort = params.get("sort") as SortKey | null;
  const mine = params.get("mine");
  return {
    q: params.get("q") ?? "",
    sort: sort && SORTS.some((s) => s.key === sort) ? sort : "best",
    servings: (params.get("serving") ?? "").split(",").filter(isServing),
    style: params.get("style"),
    mine: mine === "rated" || mine === "unrated" ? mine : null,
    by: params.get("by"),
  };
}

export function BeerList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(params.toString())), [params]);
  const { groupId, beers, stats, loading, loadError, members, hideGrades, revealAll, allRevealed, refresh } = useGroup();
  const [query, setQuery] = useState(filters.q);
  const [filterOpen, setFilterOpen] = useState(false);

  function update(patch: Partial<Record<"q" | "sort" | "serving" | "style" | "mine" | "by", string | null>>) {
    // Immer vom aktuellen URL-Stand ausgehen (nicht vom Render-Stand) – sonst überschreibt
    // die verzögerte Suche eine zwischenzeitlich gewählte Sortierung.
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "" || (k === "sort" && v === "best")) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Suche mit 150 ms Debounce in die URL schreiben
  useEffect(() => {
    if (query === filters.q) return;
    const t = setTimeout(() => update({ q: query.trim() ? query : null }), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Lokale Suche sofort anwenden, URL folgt
  const effective = useMemo(() => ({ ...filters, q: query }), [filters, query]);
  const list = useMemo(() => filterAndSort(beers, stats, effective), [beers, stats, effective]);

  const styles = useMemo(
    () => [...new Set(beers.map((b) => b.style).filter((s): s is string => !!s))].sort((a, b) => a.localeCompare(b, "de")),
    [beers],
  );

  const activeFilterCount =
    (filters.servings.length ? 1 : 0) + (filters.style ? 1 : 0) + (filters.mine ? 1 : 0) + (filters.by ? 1 : 0);

  const gradeSort = filters.sort === "best" || filters.sort === "worst";
  const anyHidden = hideGrades && !allRevealed;

  function toggleServing(s: Serving) {
    const set = new Set(filters.servings);
    if (set.has(s)) set.delete(s);
    else set.add(s);
    update({ serving: [...set].join(",") || null });
  }

  return (
    <div>
      <div className="sticky top-14 z-10 -mx-4 bg-bg/95 px-4 pt-1 pb-2 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" size={20} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bier, Brauerei oder Sorte suchen"
            aria-label="Biere durchsuchen"
            className="min-h-12 w-full rounded-2xl border border-line bg-card pr-12 pl-11 text-base placeholder:text-muted focus:border-accent focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Suche leeren"
              className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Sortierung">
          <Chip active={activeFilterCount > 0} onClick={() => setFilterOpen(true)} aria-label="Filter öffnen">
            <SlidersHorizontal size={16} aria-hidden /> Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Chip>
          {SORTS.map((s) => (
            <Chip key={s.key} active={filters.sort === s.key} onClick={() => update({ sort: s.key })}>
              {s.label}
            </Chip>
          ))}
        </div>
      </div>

      {anyHidden && beers.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-2xl bg-card-2 py-1 pr-1 pl-4 text-sm">
          {gradeSort && <Info size={16} className="shrink-0 text-muted" aria-hidden />}
          <span className="min-w-0 flex-1 text-muted">
            {gradeSort ? "Die Reihenfolge verrät die Noten." : "Fremde Noten sind verdeckt."}
          </span>
          <Button variant="ghost" className="min-h-11 shrink-0 px-3 text-sm" onClick={revealAll}>
            <Eye size={16} aria-hidden /> Alle aufdecken
          </Button>
        </div>
      )}

      {loading ? (
        <SkeletonList />
      ) : loadError ? (
        <EmptyState emoji="📡" title="Laden fehlgeschlagen">
          <p className="text-muted">Bist du online?</p>
          <Button onClick={() => refresh()}>Nochmal versuchen</Button>
        </EmptyState>
      ) : beers.length === 0 ? (
        <EmptyState emoji="🍺" title="Noch kein Bier hier – Durst?">
          <ButtonLink href={groupHref(groupId!, "rate")}>Erstes Bier bewerten</ButtonLink>
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState emoji="🔍" title="Nichts gefunden">
          <p className="text-muted">Probier eine andere Suche oder setz die Filter zurück.</p>
          {query.trim() && (
            <ButtonLink href={groupHref(groupId!, "rate", { name: query.trim() })}>
              „{query.trim()}“ bewerten
            </ButtonLink>
          )}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {list.map((b) => (
            <li key={b.id}>
              <BeerCard beer={b} stats={stats.get(b.id)} />
            </li>
          ))}
        </ul>
      )}

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter">
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-muted">Gebinde</h3>
            <div className="flex flex-wrap gap-2">
              {SERVINGS.map((s) => (
                <Chip key={s.value} active={filters.servings.includes(s.value)} onClick={() => toggleServing(s.value)}>
                  <span aria-hidden>{s.icon}</span> {s.label}
                </Chip>
              ))}
            </div>
          </section>
          {styles.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-muted">Sorte</h3>
              <div className="flex flex-wrap gap-2">
                {styles.map((s) => (
                  <Chip key={s} active={filters.style === s} onClick={() => update({ style: filters.style === s ? null : s })}>
                    {s}
                  </Chip>
                ))}
              </div>
            </section>
          )}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-muted">Meine Bewertungen</h3>
            <div className="flex flex-wrap gap-2">
              <Chip active={filters.mine === "rated"} onClick={() => update({ mine: filters.mine === "rated" ? null : "rated" })}>
                Nur von mir bewertet
              </Chip>
              <Chip
                active={filters.mine === "unrated"}
                onClick={() => update({ mine: filters.mine === "unrated" ? null : "unrated" })}
              >
                Noch nicht von mir bewertet
              </Chip>
            </div>
          </section>
          {members.length > 1 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-muted">Bewertet von …</h3>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <Chip
                    key={m.user_id}
                    active={filters.by === m.user_id}
                    onClick={() => update({ by: filters.by === m.user_id ? null : m.user_id })}
                    className="pl-1.5"
                  >
                    <Avatar profile={m.profile} size="xs" /> {m.profile.display_name}
                  </Chip>
                ))}
              </div>
            </section>
          )}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="secondary"
              onClick={() => update({ serving: null, style: null, mine: null, by: null })}
              disabled={activeFilterCount === 0}
            >
              Zurücksetzen
            </Button>
            <Button onClick={() => setFilterOpen(false)}>{list.length} anzeigen</Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
