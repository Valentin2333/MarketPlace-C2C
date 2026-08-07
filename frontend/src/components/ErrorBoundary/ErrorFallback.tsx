import styles from "./ErrorFallback.module.css";

interface ErrorFallbackProps {
  onRetry: () => void;
  fullScreen?: boolean;
}

export default function ErrorFallback({
  onRetry,
  fullScreen = true,
}: ErrorFallbackProps) {
  return (
    <div className={fullScreen ? styles.pageFull : styles.pageInline}>
      <div className={styles.card}>
        <div className={styles.icon}>⚠️</div>
        <h1 className={styles.title}>Something went wrong</h1>
        <p className={styles.text}>
          This part of MarketPlace hit an unexpected error. You can try
          again, or head back to the listings.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.retry} onClick={onRetry}>
            Try again
          </button>
          <a href="/listings" className={styles.link}>
            Go to listings
          </a>
        </div>
      </div>
    </div>
  );
}
