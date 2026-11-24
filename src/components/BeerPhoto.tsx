"use client";

import { useRef, useState } from "react";
import { Camera, ImageOff, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image";
import { friendlyError } from "@/lib/errors";
import type { Beer } from "@/lib/types";
import { useGroup } from "./GroupProvider";
import { useToast } from "./Toast";
import { Button } from "./ui";

/** Etikett-Foto eines Biers: anzeigen, aufnehmen/hochladen (verkleinert auf 1200 px), ersetzen, entfernen. */
export function BeerPhoto({ beer }: { beer: Beer }) {
  const { photoUrls, refresh } = useGroup();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const url = photoUrls.get(beer.id);

  async function upload(file: File) {
    setBusy(true);
    try {
      const blob = await resizeImage(file, 1200);
      const path = `${beer.group_id}/${beer.id}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("beer-photos")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (error) throw error;
      // photo_path setzen (aktualisiert auch updated_at → neues Bild wird sofort geladen)
      const { error: e2 } = await supabase.from("beers").update({ photo_path: path }).eq("id", beer.id);
      if (e2) throw e2;
      await refresh();
      toast({ message: "Foto gespeichert 📸" });
    } catch (e) {
      toast({ message: friendlyError(e as { message?: string }, "Foto konnte nicht gespeichert werden."), tone: "error" });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    if (!beer.photo_path) return;
    setBusy(true);
    const supabase = createClient();
    await supabase.storage.from("beer-photos").remove([beer.photo_path]);
    const { error } = await supabase.from("beers").update({ photo_path: null }).eq("id", beer.id);
    setBusy(false);
    if (error) return toast({ message: friendlyError(error), tone: "error" });
    await refresh();
    toast({ message: "Foto entfernt" });
  }

  const picker = (
    <input
      ref={input}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      aria-label="Etikett-Foto auswählen"
      data-testid="photo-input"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void upload(f);
      }}
    />
  );

  if (!url) {
    return (
      <>
        {picker}
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line font-semibold text-muted hover:bg-card-2 disabled:opacity-60"
        >
          <Camera size={20} aria-hidden /> {busy ? "Lade hoch …" : "Etikett-Foto hinzufügen"}
        </button>
      </>
    );
  }

  return (
    <div className="space-y-2">
      {picker}
      <button
        type="button"
        onClick={() => setZoom(true)}
        className="block w-full overflow-hidden rounded-2xl bg-card-2"
        aria-label="Foto vergrößern"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signierte Storage-URL, statischer Export */}
        <img src={url} alt={`Etikett von ${beer.name}`} className="max-h-72 w-full object-cover" loading="lazy" />
      </button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="min-h-11 text-sm" disabled={busy} onClick={() => input.current?.click()}>
          <RefreshCw size={16} aria-hidden /> {busy ? "Lade hoch …" : "Foto ersetzen"}
        </Button>
        <Button variant="ghost" className="min-h-11 text-sm" disabled={busy} onClick={remove}>
          <ImageOff size={16} aria-hidden /> Entfernen
        </Button>
      </div>
      {zoom && (
        <button
          type="button"
          className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoom(false)}
          aria-label="Vergrößerung schließen"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Etikett von ${beer.name}`} className="max-h-full max-w-full rounded-xl object-contain" />
        </button>
      )}
    </div>
  );
}
