"use client";

import { groupHref } from "@/lib/paths";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import {
  agreement,
  bestPartner,
  buildGradeMatrix,
  commonBeers,
  fightBeers,
  pairwise,
  spread,
  type ServingFilter,
} from "@/lib/compare";
import { gradeLabel } from "@/lib/grades";
import { SERVINGS } from "@/lib/servings";
import { useGroup } from "@/components/GroupProvider";
import { Avatar } from "@/components/Avatar";
import { GradeBadge } from "@/components/GradeBadge";
import { SkeletonList } from "@/components/Skeleton";
import { Card, Chip, EmptyState } from "@/components/ui";

type Tab = "side" | "fights" | "agree" | "matrix";
type SideSort = { kind: "beer" } | { kind: "disagree" } | { kind: "person"; id: string };

export default function ComparePage() {
  const { me, members, beers, beerById, ratings, loading, profileOf, isHidden, reveal, groupId } = useGroup();
  const [serving, setServing] = useState<ServingFilter>("all");
  const [tab, setTab] = useState<Tab>("side");
  const [sideSort, setSideSort] = useState<SideSort>({ kind: "disagree" });
  const [picked, setPicked] = useState<string[] | null>(null);

  const matrix = useMemo(() => buildGradeMatrix(ratings.filter((r) => beerById.has(r.beer_id)), serving), [ratings, beerById, serving]);
  const memberIds = useMemo(() => members.map((m) => m.user_id), [members]);

  // Standard: ich + Person mit den meisten gemeinsamen Bewertungen
  const defaultSelection = useMemo(() => {
    const partner = bestPartner(buildGradeMatrix(ratings, "all"), me.id, memberIds);
    return partner ? [me.id, partner] : [me.id];
  }, [ratings, me.id, memberIds]);
  const selected = useMemo(
    () => (picked ?? defaultSelection).filter((id) => memberIds.includes(id)),
    [picked, defaultSelection, memberIds],
  );

  function toggle(id: string) {
    const cur = new Set(selected);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    // Reihenfolge der Mitgliederliste beibehalten
    setPicked(memberIds.filter((m) => cur.has(m)));
  }

  const beerName = useCallback((id: string) => beerById.get(id)?.name ?? "?", [beerById]);
  const byName = useCallback((a: string, b: string) => beerName(a).localeCompare(beerName(b), "de"), [beerName]);

  const shared = useMemo(() => {
    const list = selected.length ? commonBeers(matrix, selected) : [];
    const sorted = [...list];
    if (sideSort.kind === "beer") sorted.sort(byName);
    else if (sideSort.kind === "disagree")
      sorted.sort((a, b) => (spread(matrix, selected, b)?.spread ?? 0) - (spread(matrix, selected, a)?.spread ?? 0) || byName(a, b));
    else {
      const id = sideSort.id;
      sorted.sort((a, b) => (matrix.get(id)?.get(a) ?? 9) - (matrix.get(id)?.get(b) ?? 9) || byName(a, b));
    }
    return sorted;
  }, [matrix, selected, sideSort, byName]);

  const fights = useMemo(
    () => (selected.length >= 2 ? fightBeers(matrix, selected, beers.map((b) => b.id)) : []),
    [matrix, selected, beers],
  );

  const ratedBeers = useMemo(
    () => beers.filter((b) => memberIds.some((u) => matrix.get(u)?.has(b.id))).map((b) => b.id).sort(byName),
    [beers, memberIds, matrix, byName],
  );

  if (loading) return <SkeletonList count={4} />;

  if (members.length < 2) {
    return (
      <EmptyState emoji="👥" title="Allein vergleicht sich's schlecht">
        <p className="text-muted">Lade Freunde in die Gruppe ein, dann könnt ihr eure Noten vergleichen.</p>
        <Link href={groupHref(groupId!, "settings")} className="font-semibold underline">
          Einladungslink holen
        </Link>
      </EmptyState>
    );
  }

  const cell = (userId: string, beerId: string) => {
    const v = matrix.get(userId)?.get(beerId);
    if (v === undefined) return <span className="text-muted">·</span>;
    const hidden = userId !== me.id && isHidden(beerId);
    return <GradeBadge value={v} size="xs" hidden={hidden} onReveal={() => reveal(beerId)} />;
  };

  const columns = tab === "matrix" ? memberIds : selected;
  const rows = tab === "matrix" ? ratedBeers : shared;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold tracking-tight">Vergleich</h1>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Personen auswählen">
        {members.map((m) => (
          <Chip key={m.user_id} active={selected.includes(m.user_id)} onClick={() => toggle(m.user_id)} className="pl-1.5">
            <Avatar profile={m.profile} size="xs" /> {m.user_id === me.id ? "Ich" : m.profile.display_name}
          </Chip>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-card-2 p-1" role="radiogroup" aria-label="Gebinde">
        {([{ value: "all", label: "Alle", icon: "" }, ...SERVINGS] as const).map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={serving === s.value}
            onClick={() => setServing(s.value as ServingFilter)}
            className={`min-h-11 rounded-xl text-sm font-bold transition ${serving === s.value ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {s.icon && <span aria-hidden>{s.icon} </span>}
            {s.label}
          </button>
        ))}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Ansicht">
        {(
          [
            ["side", "Nebeneinander"],
            ["fights", "Streitbiere"],
            ["agree", "Einigkeit"],
            ["matrix", "Alle (Matrix)"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <Chip key={key} role="tab" aria-selected={tab === key} active={tab === key} onClick={() => setTab(key)}>
            {label}
          </Chip>
        ))}
      </div>

      {(tab === "side" || tab === "matrix") &&
        (selected.length === 0 && tab === "side" ? (
          <EmptyState emoji="👆" title="Wähle oben mindestens eine Person" />
        ) : rows.length === 0 ? (
          <EmptyState
            emoji="🍻"
            title={tab === "matrix" ? "Noch keine Bewertungen." : "Ihr habt noch keine gemeinsamen Biere bewertet."}
          />
        ) : (
          <>
            {tab === "side" && (
              <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 text-sm">
                <ArrowDownUp size={16} className="shrink-0 text-muted" aria-hidden />
                <Chip active={sideSort.kind === "disagree"} onClick={() => setSideSort({ kind: "disagree" })}>
                  Uneinigkeit
                </Chip>
                <Chip active={sideSort.kind === "beer"} onClick={() => setSideSort({ kind: "beer" })}>
                  Bier
                </Chip>
                {selected.map((id) => (
                  <Chip
                    key={id}
                    active={sideSort.kind === "person" && sideSort.id === id}
                    onClick={() => setSideSort({ kind: "person", id })}
                  >
                    {id === me.id ? "Ich" : profileOf(id).display_name}
                  </Chip>
                ))}
              </div>
            )}
            <div className="-mx-4 overflow-x-auto px-4">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="sticky left-0 z-10 bg-bg py-2 pr-3 text-left font-semibold text-muted">
                      Bier
                    </th>
                    {columns.map((id) => (
                      <th key={id} scope="col" className="px-1 py-2 text-center">
                        <span className="inline-flex flex-col items-center gap-0.5">
                          <Avatar profile={profileOf(id)} size="sm" />
                          <span className="max-w-14 truncate text-[11px] text-muted">
                            {id === me.id ? "Ich" : profileOf(id).display_name}
                          </span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((beerId) => (
                    <tr key={beerId}>
                      <th
                        scope="row"
                        className="sticky left-0 z-10 max-w-[9.5rem] border-t border-line bg-bg py-1.5 pr-3 text-left font-semibold"
                      >
                        <Link href={groupHref(groupId!, "beer", { beer: beerId })} className="line-clamp-2 hover:underline">
                          {beerName(beerId)}
                        </Link>
                      </th>
                      {columns.map((id) => (
                        <td key={id} className="border-t border-line px-1 py-1.5 text-center">
                          {cell(id, beerId)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ))}

      {tab === "fights" &&
        (selected.length < 2 ? (
          <EmptyState emoji="✌️" title="Wähle mindestens zwei Personen" />
        ) : fights.length === 0 ? (
          <EmptyState emoji="🤝" title="Keine Streitbiere – ihr seid euch einig!" />
        ) : (
          <ul className="space-y-2">
            {fights.map(({ beer, s }) => {
              const hidden = isHidden(beer);
              const best = profileOf(s.best.user);
              const worst = profileOf(s.worst.user);
              return (
                <li key={beer}>
                  <Card className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <Link href={groupHref(groupId!, "beer", { beer })} className="block truncate font-bold hover:underline">
                        {beerName(beer)}
                      </Link>
                      {hidden ? (
                        <button type="button" onClick={() => reveal(beer)} className="min-h-11 text-sm font-semibold text-muted underline">
                          Verdeckt – antippen zum Aufdecken
                        </button>
                      ) : (
                        <p className="text-sm text-muted">
                          {best.display_name} <strong className="text-fg">{gradeLabel(s.best.grade)}</strong> vs.{" "}
                          {worst.display_name} <strong className="text-fg">{gradeLabel(s.worst.grade)}</strong>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Avatar profile={best} size="xs" />
                      <GradeBadge value={s.best.grade} size="xs" hidden={hidden && s.best.user !== me.id} onReveal={() => reveal(beer)} />
                      <span className="px-0.5 text-muted" aria-hidden>
                        ↔
                      </span>
                      <GradeBadge value={s.worst.grade} size="xs" hidden={hidden && s.worst.user !== me.id} onReveal={() => reveal(beer)} />
                      <Avatar profile={worst} size="xs" />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        ))}

      {tab === "agree" && <AgreementView selected={selected} matrix={matrix} />}
    </div>
  );
}

function AgreementView({ selected, matrix }: { selected: string[]; matrix: ReturnType<typeof buildGradeMatrix> }) {
  const { profileOf, me } = useGroup();
  const name = (id: string) => (id === me.id ? "Ich" : profileOf(id).display_name);

  if (selected.length < 2) return <EmptyState emoji="✌️" title="Wähle mindestens zwei Personen" />;

  if (selected.length === 2) {
    const [a, b] = selected;
    const res = agreement(matrix, a, b);
    if (!res) return <EmptyState emoji="🍻" title="Ihr habt noch keine gemeinsamen Biere bewertet." />;
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex items-center gap-3">
          <Avatar profile={profileOf(a)} size="lg" />
          <span className="text-2xl" aria-hidden>
            🤝
          </span>
          <Avatar profile={profileOf(b)} size="lg" />
        </div>
        <p className="tabular text-6xl font-black text-accent-strong">{res.percent} %</p>
        <p className="text-muted">
          Übereinstimmung zwischen {name(a)} und {name(b)} · {res.common} gemeinsame{res.common === 1 ? "s Bier" : " Biere"}
        </p>
      </Card>
    );
  }

  const { pairs, twins } = pairwise(matrix, selected);
  const lookup = (x: string, y: string) => pairs.find((p) => (p.a === x && p.b === y) || (p.a === y && p.b === x))?.result;

  return (
    <div className="space-y-3">
      {twins && (
        <Card className="flex items-center gap-3 bg-accent/15">
          <span className="text-3xl" aria-hidden>
            👯
          </span>
          <div>
            <p className="font-bold">Geschmackszwillinge</p>
            <p className="text-muted">
              {name(twins.a)} &amp; {name(twins.b)} – {twins.result!.percent} % ({twins.result!.common} Biere)
            </p>
          </div>
        </Card>
      )}
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <td />
              {selected.map((id) => (
                <th key={id} scope="col" className="text-center">
                  <Avatar profile={profileOf(id)} size="sm" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selected.map((row) => (
              <tr key={row}>
                <th scope="row" className="pr-2 text-left font-semibold whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <Avatar profile={profileOf(row)} size="xs" /> {name(row)}
                  </span>
                </th>
                {selected.map((col) => {
                  if (row === col) return <td key={col} className="h-11 w-14 rounded-lg bg-card-2" aria-hidden />;
                  const r = lookup(row, col);
                  const isTwin = twins && ((twins.a === row && twins.b === col) || (twins.a === col && twins.b === row));
                  return (
                    <td
                      key={col}
                      className={`tabular h-11 w-14 rounded-lg text-center font-bold ${isTwin ? "bg-accent text-accent-fg" : "bg-card"}`}
                      title={r ? `${r.common} gemeinsame Biere` : "keine gemeinsamen Biere"}
                    >
                      {r ? `${r.percent} %` : "–"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
