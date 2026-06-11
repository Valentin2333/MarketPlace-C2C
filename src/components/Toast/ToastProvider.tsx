import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ToastContext } from "./toast-context";
import type { ToastApi, ToastItem, ToastType } from "./toast-context";
import styles from "./Toast.module.css";

const DURATION = 4000;
const EXIT = 200;

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "!",
  info: "i",
};

function ToastCard({
  toast,
  onClose,
}: {
  toast: ToastItem;
  onClose: (id: string) => void;
}) {
  const [leaving, setLeaving] = useState(false);

  const dismiss = useCallback(() => {
    setLeaving(true);
    window.setTimeout(() => onClose(toast.id), EXIT);
  }, [onClose, toast.id]);

  useEffect(() => {
    const timer = window.setTimeout(dismiss, DURATION);
    return () => window.clearTimeout(timer);
  }, [dismiss]);

  return (
    <div
      className={`${styles.toast} ${styles[toast.type]} ${leaving ? styles.leaving : ""}`}
      role="status"
    >
      <span className={styles.icon}>{ICONS[toast.type]}</span>
      <span className={styles.message}>{toast.message}</span>
      <button
        type="button"
        className={styles.close}
        onClick={dismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    setToasts((prev) => [...prev, { id: crypto.randomUUID(), type, message }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message: string) => push("success", message),
      error: (message: string) => push("error", message),
      info: (message: string) => push("info", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.container} aria-live="polite">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
