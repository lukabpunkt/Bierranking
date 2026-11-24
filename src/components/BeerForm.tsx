"use client";

import { STYLES } from "@/lib/servings";
import { Chip, Field, inputClass } from "./ui";

export type BeerDraft = { name: string; brewery: string; style: string; abv: string; country: string; barcode?: string };

export const emptyDraft = (name = ""): BeerDraft => ({ name, brewery: "", style: "", abv: "", country: "", barcode: "" });

export function draftToRow(d: BeerDraft) {
  const abv = d.abv.trim() ? Number(d.abv.replace(",", ".")) : null;
  return {
    name: d.name.trim(),
    brewery: d.brewery.trim() || null,
    style: d.style.trim() || null,
    abv: abv !== null && Number.isFinite(abv) ? Math.round(abv * 10) / 10 : null,
    country: d.country.trim() || null,
    barcode: d.barcode?.trim() || null,
  };
}

export function draftValid(d: BeerDraft) {
  if (!d.name.trim()) return false;
  if (d.abv.trim()) {
    const n = Number(d.abv.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 70) return false;
  }
  return true;
}

export function BeerForm({ draft, onChange }: { draft: BeerDraft; onChange: (d: BeerDraft) => void }) {
  const set = (patch: Partial<BeerDraft>) => onChange({ ...draft, ...patch });
  const styleOptions = draft.style && !STYLES.includes(draft.style) ? [...STYLES, draft.style] : STYLES;

  return (
    <div className="space-y-4">
      <Field label="Name *">
        <input className={inputClass} value={draft.name} maxLength={80} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="Brauerei">
        <input
          className={inputClass}
          value={draft.brewery}
          maxLength={80}
          placeholder="z. B. Augustiner"
          onChange={(e) => set({ brewery: e.target.value })}
        />
      </Field>
      <div>
        <span className="mb-1.5 block text-sm font-semibold text-muted">Sorte</span>
        <div className="flex flex-wrap gap-2">
          {styleOptions.map((s) => (
            <Chip key={s} active={draft.style === s} onClick={() => set({ style: draft.style === s ? "" : s })}>
              {s}
            </Chip>
          ))}
        </div>
      </div>
      {draft.barcode && (
        <p className="flex items-center justify-between gap-2 rounded-2xl bg-card-2 px-4 py-2 text-sm">
          <span>
            <span className="text-muted">Barcode</span> <span className="tabular font-semibold">{draft.barcode}</span>
          </span>
          <button type="button" className="min-h-11 px-2 text-muted underline" onClick={() => set({ barcode: "" })}>
            entfernen
          </button>
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Alkohol %">
          <input
            className={inputClass}
            value={draft.abv}
            inputMode="decimal"
            placeholder="5,0"
            onChange={(e) => set({ abv: e.target.value })}
          />
        </Field>
        <Field label="Land">
          <input
            className={inputClass}
            value={draft.country}
            maxLength={40}
            placeholder="Deutschland"
            onChange={(e) => set({ country: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
