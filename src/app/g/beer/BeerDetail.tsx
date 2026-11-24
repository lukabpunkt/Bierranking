"use client";

import { groupHref } from "@/lib/paths";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, History, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatAvg, gradeColor, gradeLabel } from "@/lib/grades";
import { servingInfo, SERVINGS } from "@/lib/servings";
import { friendlyError, isUniqueViolation } from "@/lib/errors";
import type { Rating } from "@/lib/types";
import { useGroup } from "@/components/GroupProvider";
import { GradeBadge } from "@/components/GradeBadge";
import { Avatar } from "@/components/Avatar";
import { BottomSheet } from "@/components/BottomSheet";
import { BeerForm, draftToRow, draftValid, type BeerDraft } from "@/components/BeerForm";
import { BeerHistory } from "@/components/BeerHistory";
import { BeerPhoto } from "@/components/BeerPhoto";
import { WishButton } from "@/components/WishButton";
import { Button, ButtonLink, Card, EmptyState } from "@/components/ui";
import { SkeletonBlock } from "@/components/Skeleton";
import { useToast } from "@/components/Toast";

function formatDate(d: string) {
  return new Date(d.length === 10 ? d + "T12:00:00" : d).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BeerDetail({ beerId }: { beerId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { groupId, beerById, ratings, stats, me, isAdmin, profileOf, isHidden, reveal, wasJustRevealed, loading, refresh } =
    useGroup();
  const [menu, setMenu] = useState(false);
  const [edit, setEdit] = useState<BeerDraft | null>(null);
  const [history, setHistory] = useState(false);
  const [busy, setBusy] = useState(false);

  const beer = beerById.get(beerId);
  const s = stats.get(beerId);
  const hidden = isHidden(beerId);
  const animate = wasJustRevealed(beerId);

  const list = useMemo(
    () =>
      ratings
        .filter((r) => r.beer_id === beerId)
        .sort((a, b) => {
          if (a.user_id === me.id && b.user_id !== me.id) return -1;
          if (b.user_id === me.id && a.user_id !== me.id) return 1;
          return b.rated_on.localeCompare(a.rated_on) || b.updated_at.localeCompare(a.updated_at);
        }),
    [ratings, beerId, me.id],
  );

  const distribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (const r of list) counts[Math.min(6, Math.max(1, Math.round(r.grade))) - 1]++;
    return counts;
  }, [list]);
  const maxCount = Math.max(1, ...distribution);

  if (loading && !beer) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-48" />
      </div>
    );
  }

  if (!beer) {
    return (
      <EmptyState emoji="🫗" title="Bier nicht gefunden">
        <p className="text-muted">Vielleicht wurde es gelöscht.</p>
        <ButtonLink href={groupHref(groupId!)}>Zur Bierliste</ButtonLink>
      </EmptyState>
    );
  }

  const canDelete = beer.created_by === me.id || isAdmin;
  const creator = profileOf(beer.created_by);

  async function deleteRating(r: Rating) {
    const supabase = createClient();
    const { error } = await supabase.from("ratings").update({ deleted_at: new Date().toISOString() }).eq("id", r.id);
    if (error) return toast({ message: friendlyError(error), tone: "error" });
    await refresh();
    toast({
      message: "Bewertung gelöscht",
      action: {
        label: "Rückgängig",
        onClick: async () => {
          await createClient().from("ratings").update({ deleted_at: null }).eq("id", r.id);
          await refresh();
        },
      },
    });
  }

  async function saveEdit() {
    if (!edit || !draftValid(edit)) return;
    setBusy(true);
    const { error } = await createClient().from("beers").update(draftToRow(edit)).eq("id", beerId);
    setBusy(false);
    if (error) {
      return toast({
        message: isUniqueViolation(error) ? "Ein Bier mit diesem Namen und dieser Brauerei gibt es schon." : friendlyError(error),
        tone: "error",
      });
    }
    setEdit(null);
    await refresh();
    toast({ message: "Bier aktualisiert" });
  }

  async function deleteBeer() {
    setMenu(false);
    const { error } = await createClient().from("beers").update({ deleted_at: new Date().toISOString() }).eq("id", beerId);
    if (error) return toast({ message: friendlyError(error), tone: "error" });
    await refresh();
    router.push(groupHref(groupId!));
    toast({
      message: `„${beer!.name}“ gelöscht`,
      action: {
        label: "Rückgängig",
        onClick: async () => {
          const { error } = await createClient().from("beers").update({ deleted_at: null }).eq("id", beerId);
          if (error) toast({ message: friendlyError(error), tone: "error" });
          await refresh();
        },
      },
    });
  }

  const facts = [
    beer.brewery,
    beer.style,
    beer.abv != null ? `${String(beer.abv).replace(".", ",")} %` : null,
    beer.country,
  ].filter(Boolean);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <Link
          href={groupHref(groupId!)}
          className="-ml-2 flex h-11 items-center gap-1 rounded-xl px-2 font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft size={20} aria-hidden /> Biere
        </Link>
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-label="Weitere Aktionen"
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-card-2"
        >
          <MoreHorizontal size={24} />
        </button>
      </div>

      <Card>
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl leading-tight font-extrabold tracking-tight break-words">{beer.name}</h1>
            {facts.length > 0 && <p className="mt-1 text-muted">{facts.join(" · ")}</p>}
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Avatar profile={creator} size="xs" /> angelegt von {creator.display_name} am {formatDate(beer.created_at)}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1">
            <GradeBadge value={s?.avg ?? null} size="xl" hidden={hidden && !!s?.count} onReveal={() => reveal(beerId)} animate={animate} />
            <span className="tabular text-sm text-muted">
              {hidden && s?.count ? "Ø ?" : `Ø ${formatAvg(s?.avg)}`} · {s?.count ?? 0}×
            </span>
          </div>
        </div>
      </Card>

      <WishButton beerId={beerId} />

      <BeerPhoto beer={beer} />

      <div className="grid grid-cols-3 gap-2">
        {SERVINGS.map((sv) => {
          const v = s?.avgBy[sv.value] ?? null;
          return (
            <div key={sv.value} className="flex flex-col items-center gap-1 rounded-2xl bg-card p-3 shadow-sm">
              <span className="text-2xl" aria-hidden>
                {sv.icon}
              </span>
              <span className="text-xs font-semibold text-muted">{sv.label}</span>
              {v !== null && hidden ? (
                <GradeBadge value={v} size="xs" hidden onReveal={() => reveal(beerId)} />
              ) : (
                <span
                  className="tabular rounded-lg px-2 py-0.5 text-lg font-extrabold"
                  style={v !== null ? { backgroundColor: gradeColor(v).bg, color: gradeColor(v).fg } : undefined}
                  aria-label={v !== null ? `${sv.label}: Durchschnitt ${formatAvg(v)}` : `${sv.label}: keine Daten`}
                >
                  {formatAvg(v)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {list.length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold">Notenverteilung</h2>
          {hidden ? (
            <button type="button" onClick={() => reveal(beerId)} className="min-h-11 w-full rounded-xl bg-hidden font-semibold text-hidden-fg">
              Verdeckt – antippen zum Aufdecken
            </button>
          ) : (
            <ul className="space-y-1.5" aria-label="Anzahl Bewertungen je ganzer Note">
              {distribution.map((c, i) => {
                const n = i + 1;
                const { bg } = gradeColor(n);
                return (
                  <li key={n} className="flex items-center gap-3">
                    <span className="tabular w-4 text-right font-bold">{n}</span>
                    <span className="h-6 flex-1 overflow-hidden rounded-lg bg-card-2">
                      <span
                        className="block h-full rounded-lg transition-all"
                        style={{ width: `${(c / maxCount) * 100}%`, backgroundColor: bg }}
                      />
                    </span>
                    <span className="tabular w-6 text-right text-sm text-muted">{c}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      <section>
        <h2 className="mb-2 px-1 font-bold">Alle Bewertungen ({list.length})</h2>
        {list.length === 0 ? (
          <Card className="text-center text-muted">Noch niemand hat dieses Bier bewertet.</Card>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => {
              const p = profileOf(r.user_id);
              const mine = r.user_id === me.id;
              const sv = servingInfo(r.serving);
              return (
                <li key={r.id} className="rounded-2xl bg-card p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar profile={p} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {p.display_name}
                        {mine && <span className="text-muted"> (du)</span>}
                      </p>
                      <p className="truncate text-sm text-muted">
                        <span aria-label={sv.label}>{sv.icon}</span> {sv.label} · {formatDate(r.rated_on)}
                        {r.location && ` · ${r.location}`}
                      </p>
                    </div>
                    <GradeBadge
                      value={r.grade}
                      size="md"
                      hidden={hidden && !mine}
                      onReveal={() => reveal(beerId)}
                      animate={animate}
                    />
                  </div>
                  {r.comment && (!hidden || mine) && <p className="mt-2 pl-[3.25rem] text-[15px]">„{r.comment}“</p>}
                  {mine && (
                    <div className="mt-2 flex justify-end gap-1">
                      <Link
                        href={groupHref(groupId!, "rate", { beer: beerId, serving: r.serving })}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold hover:bg-card-2"
                      >
                        <Pencil size={16} aria-hidden /> Bearbeiten
                      </Link>
                      <button
                        type="button"
                        onClick={() => deleteRating(r)}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-danger hover:bg-card-2"
                      >
                        <Trash2 size={16} aria-hidden /> Löschen
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="fixed inset-x-0 z-20 px-4" style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto max-w-[608px]">
          <ButtonLink href={groupHref(groupId!, "rate", { beer: beerId })} className="h-14 w-full text-lg shadow-xl">
            {s?.myRated ? "Nochmal bewerten" : "Bewerten"}
          </ButtonLink>
        </div>
      </div>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={beer.name}>
        <div className="space-y-2">
          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={() => {
              setMenu(false);
              setEdit({
                name: beer.name,
                brewery: beer.brewery ?? "",
                style: beer.style ?? "",
                abv: beer.abv != null ? String(beer.abv).replace(".", ",") : "",
                country: beer.country ?? "",
              });
            }}
          >
            <Pencil size={18} aria-hidden /> Bier bearbeiten
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-start"
            onClick={() => {
              setMenu(false);
              setHistory(true);
            }}
          >
            <History size={18} aria-hidden /> Änderungsverlauf
          </Button>
          {canDelete && (
            <Button variant="ghost" className="w-full justify-start text-danger" onClick={deleteBeer}>
              <Trash2 size={18} aria-hidden /> Bier löschen
            </Button>
          )}
        </div>
      </BottomSheet>

      <BottomSheet open={edit !== null} onClose={() => setEdit(null)} title="Bier bearbeiten">
        {edit && (
          <div className="space-y-4">
            <BeerForm draft={edit} onChange={setEdit} />
            <Button className="w-full" disabled={busy || !draftValid(edit)} onClick={saveEdit}>
              Speichern
            </Button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet open={history} onClose={() => setHistory(false)} title="Änderungsverlauf">
        {history && <BeerHistory beerId={beerId} />}
      </BottomSheet>

      {hidden && list.length > 0 && (
        <p className="text-center text-sm text-muted">
          Noten verdeckt ·{" "}
          <button type="button" className="min-h-11 font-semibold underline" onClick={() => reveal(beerId)}>
            aufdecken
          </button>
        </p>
      )}
      {!hidden && s?.avg != null && (
        <p className="sr-only">
          Durchschnitt {formatAvg(s.avg)}, etwa {gradeLabel(s.avg)}
        </p>
      )}
    </div>
  );
}
