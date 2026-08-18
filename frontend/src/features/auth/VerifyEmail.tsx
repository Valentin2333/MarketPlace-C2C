import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../lib/auth/useAuth";
import AuthHeader from "./AuthHeader";
import styles from "./VerifyEmail.module.css";

type Status = "verifying" | "success" | "error";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { completeEmailVerification } = useAuth();

  const [status, setStatus] = useState<Status>("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const run = async () => {
      if (!token) {
        setStatus("error");
        setErrorMessage("This verification link is invalid.");
        return;
      }

      try {
        await completeEmailVerification(token);
        setStatus("success");
        setTimeout(() => navigate("/listings"), 1800);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Could not verify your email.",
        );
      }
    };

    run();
  }, [token, completeEmailVerification, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.cardWrap}>
        <div className={styles.card}>
          <AuthHeader
            title="Verify your email"
            subtitle="Confirming your address..."
          />

          {status === "verifying" && (
            <div className={styles.sentBox}>
              <div className={styles.sentIcon}>⏳</div>
              <p className={styles.sentText}>Verifying your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className={styles.sentBox}>
              <div className={styles.sentIcon}>✅</div>
              <p className={styles.sentText}>
                Your email is verified. Taking you in...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className={styles.sentBox}>
              <div className={styles.sentIcon}>⚠️</div>
              <p className={styles.sentText}>
                {errorMessage ??
                  "This verification link is invalid or has expired."}
              </p>
              <Link to="/login" className={styles.inlineBtn}>
                Back to sign in
              </Link>
            </div>
          )}

          <p className={styles.footer}>
            Back to <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
