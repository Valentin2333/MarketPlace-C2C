import styles from "./Spinner.module.css";

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

export default function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <svg
      className={`${styles.spinner} ${styles[size]} ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle
        className={styles.track}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className={styles.arc}
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
