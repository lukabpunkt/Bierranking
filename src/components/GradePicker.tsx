"use client";

import { gradeColor, gradeFromParts, gradeLabel, type Modifier } from "@/lib/grades";

const MODS: { value: Modifier; label: string; aria: string }[] = [
  { value: "+", label: "+", aria: "Plus (besser)" },
  { value: "", label: "glatt", aria: "glatt" },
  { value: "−", label: "−", aria: "Minus (schlechter)" },
];

export function GradePicker({
  base,
  mod,
  onChange,
}: {
  base: number | null;
  mod: Modifier;
  onChange: (base: number, mod: Modifier) => void;
}) {
  const value = base ? gradeFromParts(base, mod) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Note">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const { bg, fg } = gradeColor(n);
          const active = base === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`Note ${n}`}
              onClick={() => onChange(n, n === 6 ? "" : mod)}
              className={`tabular flex h-14 items-center justify-center rounded-2xl text-2xl font-extrabold transition active:scale-95 ${
                active ? "scale-105 ring-4 ring-fg/80" : "opacity-80 hover:opacity-100"
              }`}
              style={{ backgroundColor: bg, color: fg }}
            >
              {n}
            </button>
          );
        })}
      </div>

      {base !== 6 && (
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-card-2 p-1" role="radiogroup" aria-label="Tendenz">
          {MODS.map((m) => (
            <button
              key={m.label}
              type="button"
              role="radio"
              aria-checked={mod === m.value}
              aria-label={m.aria}
              onClick={() => onChange(base ?? 2, m.value)}
              className={`min-h-11 rounded-xl text-lg font-bold transition ${
                mod === m.value ? "bg-card shadow-sm" : "text-muted"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex h-24 items-center justify-center" aria-live="polite">
        {value !== null ? (
          <span
            key={value}
            className="anim-pop tabular inline-flex h-24 min-w-24 items-center justify-center rounded-3xl px-4 text-5xl font-black"
            style={{ backgroundColor: gradeColor(value).bg, color: gradeColor(value).fg }}
            aria-label={`Gewählte Note ${gradeLabel(value)}`}
          >
            {gradeLabel(value)}
          </span>
        ) : (
          <span className="text-muted">Wähle eine Note</span>
        )}
      </div>
    </div>
  );
}
