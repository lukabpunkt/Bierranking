"use client";

import { SERVINGS } from "@/lib/servings";
import type { Serving } from "@/lib/types";

export function ServingPicker({ value, onChange }: { value: Serving | null; onChange: (s: Serving) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Gebinde">
      {SERVINGS.map((s) => {
        const active = value === s.value;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s.value)}
            className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 font-bold transition active:scale-95 ${
              active ? "border-accent bg-accent/15" : "border-line bg-card hover:bg-card-2"
            }`}
          >
            <span className="text-4xl" aria-hidden>
              {s.icon}
            </span>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
