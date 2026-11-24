"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastAction = { label: string; onClick: () => void | Promise<void> };
type ToastInput = { message: string; action?: ToastAction; duration?: number; tone?: "default" | "error" };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);

  const show = useCallback((t: ToastInput) => {
    const id = nextId.current++;
    // Immer nur einen Toast zeigen – der neueste ersetzt den alten.
    setToasts([{ ...t, id }]);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
        style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDone={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, toast.duration ?? (toast.action ? 5000 : 3000));
    return () => clearTimeout(timer);
  }, [toast, onDone]);

  return (
    <div
      className={`anim-toast-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 shadow-lg ${
        toast.tone === "error" ? "bg-danger text-white" : "bg-fg text-bg"
      }`}
    >
      <span className="flex-1 text-[15px] font-medium">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="min-h-11 rounded-xl px-3 font-bold text-accent underline-offset-2 hover:underline"
          onClick={async () => {
            onDone();
            await toast.action!.onClick();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
