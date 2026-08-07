import { Link } from "react-router-dom";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.code}>404</div>
        <div className={styles.icon}>🧭</div>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.text}>
          There's nothing at this address. It might have been moved, deleted,
          or never existed.
        </p>
        <div className={styles.actions}>
          <Link to="/listings" className={styles.primary}>
            Browse listings
          </Link>
        </div>
      </div>
    </div>
  );
}
