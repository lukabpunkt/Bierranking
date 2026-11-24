"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useGroup } from "./GroupProvider";
import { AvatarStack } from "./Avatar";

/** „Will ich probieren“ umschalten + zeigen, wer das Bier noch probieren will. */
export function WishButton({ beerId }: { beerId: string }) {
  const { isWished, toggleWish, wishlist, profileOf, me, stats } = useGroup();
  const wished = isWished(beerId);
  const others = wishlist.filter((w) => w.beer_id === beerId && w.user_id !== me.id).map((w) => profileOf(w.user_id));
  const myRated = stats.get(beerId)?.myRated;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {!myRated && (
        <button
          type="button"
          onClick={() => toggleWish(beerId)}
          aria-pressed={wished}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition ${
            wished ? "border-accent bg-accent/15 text-accent-strong" : "border-line bg-card hover:bg-card-2"
          }`}
        >
          {wished ? <BookmarkCheck size={18} aria-hidden /> : <Bookmark size={18} aria-hidden />}
          {wished ? "Auf meiner Wunschliste" : "Will ich probieren"}
        </button>
      )}
      {others.length > 0 && (
        <span className="flex items-center gap-2 text-sm text-muted">
          <AvatarStack profiles={others} /> {others.length === 1 ? "will" : "wollen"} es auch probieren
        </span>
      )}
    </div>
  );
}
