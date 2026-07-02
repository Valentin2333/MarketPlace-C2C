import { useCallback, useEffect, useState } from "react";
import styles from "../listings/ReportListingModal.module.css";

const REASONS = [
  { value: "harassment", label: "Harassment or abusive behavior" },
  { value: "scam", label: "Scam or fraud" },
  { value: "fake_profile", label: "Fake profile or impersonation" },
  { value: "other", label: "Other" },
];

type ReportUserModalProps = {
  open: boolean;
  loading?: boolean;
  onSubmit: (reason: string) => void;
  onClose: () => void;
};

export default function ReportUserModal({
  open,
  loading = false,
  onSubmit,
  onClose,
}: ReportUserModalProps) {
  const [reason, setReason] = useState<string | null>(null);

  const requestClose = useCallback(() => {
    setReason(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) requestClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, loading, requestClose]);

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ""}`}
        onClick={loading ? undefined : requestClose}
      />

      <div
        className={`${styles.modal} ${open ? styles.modalOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Report user"
        aria-hidden={!open}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Report user</h2>
          <button
            type="button"
            className={styles.close}
            onClick={requestClose}
            disabled={loading}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.message}>Why are you reporting this user?</p>
          <div className={styles.options}>
            {REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`${styles.option} ${reason === r.value ? styles.optionActive : ""}`}
                onClick={() => setReason(r.value)}
                disabled={loading}
              >
                <span className={styles.radio} />
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.cancel}
            onClick={requestClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.submit}
            onClick={() => reason && onSubmit(reason)}
            disabled={loading || !reason}
          >
            {loading ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    </>
  );
}
