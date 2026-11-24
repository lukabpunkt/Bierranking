import type { Profile } from "@/lib/types";

const SIZES = { xs: "h-6 w-6 text-xs", sm: "h-8 w-8 text-base", md: "h-10 w-10 text-xl", lg: "h-16 w-16 text-3xl" };

export function Avatar({
  profile,
  size = "sm",
  ring = false,
  title,
}: {
  profile: Pick<Profile, "emoji" | "color" | "display_name">;
  size?: keyof typeof SIZES;
  ring?: boolean;
  title?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full ${SIZES[size]} ${
        ring ? "ring-2 ring-card" : ""
      }`}
      style={{ backgroundColor: profile.color }}
      title={title ?? profile.display_name}
      role="img"
      aria-label={profile.display_name || "Mitglied"}
    >
      <span aria-hidden>{profile.emoji}</span>
    </span>
  );
}

export function AvatarStack({ profiles, max = 4 }: { profiles: Profile[]; max?: number }) {
  const shown = profiles.slice(0, max);
  const rest = profiles.length - shown.length;
  return (
    <span className="flex items-center -space-x-2">
      {shown.map((p) => (
        <Avatar key={p.id} profile={p} size="xs" ring />
      ))}
      {rest > 0 && (
        <span className="z-10 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-card-2 px-1 text-[11px] font-bold ring-2 ring-card">
          +{rest}
        </span>
      )}
    </span>
  );
}
