"use client";

import { formatAvg, gradeColor, gradeLabel } from "@/lib/grades";

const SIZES = {
  xs: "h-8 min-w-8 rounded-lg text-sm",
  sm: "h-10 min-w-10 rounded-xl text-base",
  md: "h-12 min-w-12 rounded-xl text-xl",
  lg: "h-16 w-16 rounded-2xl text-2xl",
  xl: "h-24 w-24 rounded-3xl text-4xl",
};

/**
 * Noten-Badge. Mit `hidden` wird ein graues „?“ gezeigt (ohne Farbe, die würde die Note verraten).
 * Antippen ruft `onReveal` auf. `showAvg` zeigt zusätzlich „Ø 2,1“ klein darunter.
 */
export function GradeBadge({
  value,
  size = "sm",
  hidden = false,
  onReveal,
  showAvg = false,
  animate = false,
}: {
  value: number | null | undefined;
  size?: keyof typeof SIZES;
  hidden?: boolean;
  onReveal?: () => void;
  showAvg?: boolean;
  animate?: boolean;
}) {
  const base = `tabular inline-flex shrink-0 flex-col items-center justify-center px-1.5 font-extrabold leading-none ${SIZES[size]}`;

  if (value == null) {
    return (
      <span className={`${base} border-2 border-dashed border-line text-muted`} aria-label="Noch keine Note">
        –
      </span>
    );
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onReveal?.();
        }}
        className={`${base} bg-hidden text-hidden-fg`}
        aria-label="Note verdeckt – antippen zum Aufdecken"
      >
        ?
      </button>
    );
  }

  const { bg, fg } = gradeColor(value);
  const label = gradeLabel(value);
  return (
    <span
      className={`${base} ${animate ? "anim-reveal" : ""}`}
      style={{ backgroundColor: bg, color: fg }}
      aria-label={showAvg ? `Durchschnitt ${formatAvg(value)}, etwa Note ${label}` : `Note ${label}`}
    >
      <span>{label}</span>
      {showAvg && <span className="mt-1 text-[11px] font-semibold opacity-90">Ø {formatAvg(value)}</span>}
    </span>
  );
}
