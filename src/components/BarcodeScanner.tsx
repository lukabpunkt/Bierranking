"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";
import { isValidEan } from "@/lib/openFoodFacts";
import { BottomSheet } from "./BottomSheet";
import { Button, inputClass } from "./ui";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/**
 * Kamera-Scanner für EAN/UPC-Barcodes.
 * 1) BarcodeDetector (Chrome/Android) – schnell, ohne Zusatzcode
 * 2) sonst ZXing (iOS/Safari, Firefox) – wird erst beim Öffnen nachgeladen
 * Fallback: Nummer von Hand eintippen.
 */
export function BarcodeScanner({
  open,
  onClose,
  onDetected,
}: {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    doneRef.current = false;
    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let zxingControls: { stop: () => void } | null = null;
    const video = videoRef.current;

    const finish = (code: string) => {
      if (doneRef.current) return;
      doneRef.current = true;
      if ("vibrate" in navigator) navigator.vibrate?.(60);
      onDetected(code);
    };

    (async () => {
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Die Kamera ist in diesem Browser nicht verfügbar.");
        setShowManual(true);
        return;
      }
      const Native = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
      try {
        if (Native) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
          if (stopped || !videoRef.current) return;
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          const detector = new Native({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
          const loop = async () => {
            if (stopped || doneRef.current || !videoRef.current) return;
            try {
              const found = await detector.detect(videoRef.current);
              const code = found.find((f) => /^\d{8,14}$/.test(f.rawValue))?.rawValue;
              if (code) return finish(code);
            } catch {
              /* einzelner Frame fehlgeschlagen – weiter */
            }
            raf = requestAnimationFrame(loop);
          };
          raf = requestAnimationFrame(loop);
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const { BarcodeFormat, DecodeHintType } = await import("@zxing/library");
          if (stopped || !videoRef.current) return;
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
          ]);
          const reader = new BrowserMultiFormatReader(hints);
          zxingControls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } }, audio: false },
            videoRef.current,
            (result) => {
              if (result) finish(result.getText());
            },
          );
        }
      } catch (e) {
        const name = (e as Error)?.name;
        setError(
          name === "NotAllowedError"
            ? "Kein Kamerazugriff. Erlaube die Kamera in den Browser-Einstellungen oder tippe die Nummer ein."
            : "Die Kamera konnte nicht gestartet werden.",
        );
        setShowManual(true);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      }
    };
  }, [open, onDetected]);

  const manualCode = manual.replace(/\D/g, "");
  const manualOk = isValidEan(manualCode);

  return (
    <BottomSheet open={open} onClose={onClose} title="Barcode scannen">
      <div className="space-y-3">
        {!error && (
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} className="aspect-[4/3] w-full object-cover" playsInline muted aria-label="Kamerabild" />
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-xl border-4 border-accent/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}
        {!error && <p className="text-center text-sm text-muted">Halte den Strichcode der Flasche oder Dose in den Rahmen.</p>}
        {error && (
          <p className="rounded-2xl bg-card-2 px-4 py-3 text-sm" role="alert">
            {error}
          </p>
        )}

        {showManual ? (
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (manualOk) onDetected(manualCode);
            }}
          >
            <input
              className={inputClass}
              inputMode="numeric"
              autoComplete="off"
              placeholder="z. B. 4066600641919"
              aria-label="Barcode-Nummer"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
            {manualCode.length >= 8 && !manualOk && <p className="text-sm text-danger">Diese Nummer ist kein gültiger EAN-Code.</p>}
            <Button type="submit" className="w-full" disabled={!manualOk}>
              Übernehmen
            </Button>
          </form>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setShowManual(true)}>
            <Keyboard size={18} aria-hidden /> Nummer eintippen
          </Button>
        )}
      </div>
    </BottomSheet>
  );
}
