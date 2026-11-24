export function SkeletonCard() {
  return (
    <div className="anim-shimmer flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm" aria-hidden>
      <div className="h-16 w-16 rounded-2xl bg-card-2" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-card-2" />
        <div className="h-3 w-1/2 rounded bg-card-2" />
        <div className="h-3 w-1/3 rounded bg-card-2" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Lädt …">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonBlock({ className = "h-24" }: { className?: string }) {
  return <div className={`anim-shimmer rounded-2xl bg-card-2 ${className}`} aria-hidden />;
}
