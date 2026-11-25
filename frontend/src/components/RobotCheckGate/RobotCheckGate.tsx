import { useState, type ReactNode } from "react";
import { verifyTurnstileToken } from "../../lib/turnstile/turnstileApi";
import { TURNSTILE_SITE_KEY } from "./turnstileScript";
import TurnstileWidget from "./TurnstileWidget";
import styles from "./RobotCheckGate.module.css";

const PASSED_KEY = "robot-check-passed";

type Status = "checking" | "verifying" | "passed" | "error";

export default function RobotCheckGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(() =>
    !TURNSTILE_SITE_KEY || sessionStorage.getItem(PASSED_KEY) === "true"
      ? "passed"
      : "checking",
  );
  const [resetSignal, setResetSignal] = useState(0);

  const handleToken = async (token: string) => {
    setStatus("verifying");
    try {
      const ok = await verifyTurnstileToken(token);
      if (ok) {
        sessionStorage.setItem(PASSED_KEY, "true");
        setStatus("passed");
        return;
      }
    } catch {
      // fall through to the error state below
    }
    setStatus("error");
    setResetSignal((n) => n + 1);
  };

  if (status === "passed") return <>{children}</>;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Just checking you're human</h1>
        <p className={styles.text}>
          This quick check keeps MarketPlace safe from bots. It usually finishes
          on its own.
        </p>
        <div className={styles.widget}>
          <TurnstileWidget
            onToken={handleToken}
            onError={() => setStatus("error")}
            resetSignal={resetSignal}
          />
        </div>
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
