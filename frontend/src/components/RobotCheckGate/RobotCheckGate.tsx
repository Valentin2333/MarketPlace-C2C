import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "../Theme/useTheme";
import { verifyTurnstileToken } from "../../lib/turnstile/turnstileApi";
import { TURNSTILE_SITE_KEY, loadTurnstileScript } from "./turnstileScript";
import styles from "./RobotCheckGate.module.css";

const SITE_KEY = TURNSTILE_SITE_KEY;
const PASSED_KEY = "robot-check-passed";

type Status = "checking" | "verifying" | "passed" | "error";

export default function RobotCheckGate({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>(() =>
    !SITE_KEY || sessionStorage.getItem(PASSED_KEY) === "true"
      ? "passed"
      : "checking",
  );

  useEffect(() => {
    if (status === "passed") return;

    let cancelled = false;
    let widgetId: string | null = null;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;

        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY!,
          theme,
          callback: async (token: string) => {
            setStatus("verifying");
            try {
              const ok = await verifyTurnstileToken(token);
              if (cancelled) return;
              if (ok) {
                sessionStorage.setItem(PASSED_KEY, "true");
                setStatus("passed");
              } else {
                setStatus("error");
                if (widgetId) window.turnstile?.reset(widgetId);
              }
            } catch {
              if (cancelled) return;
              setStatus("error");
              if (widgetId) window.turnstile?.reset(widgetId);
            }
          },
          "error-callback": () => {
            if (!cancelled) setStatus("error");
          },
          "expired-callback": () => {
            if (!cancelled && widgetId) window.turnstile?.reset(widgetId);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [theme, status === "passed"]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "passed") return <>{children}</>;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Just checking you're human</h1>
        <p className={styles.text}>
          This quick check keeps MarketPlace safe from bots. It usually finishes
          on its own.
        </p>
        <div ref={containerRef} className={styles.widget} />
        {status === "verifying" && (
          <p className={styles.status}>Verifying…</p>
        )}
        {status === "error" && (
          <p className={styles.error}>
            Verification failed. Please refresh the page and try again.
          </p>
        )}
      </div>
    </div>
  );
}
