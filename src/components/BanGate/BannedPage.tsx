import { supabase } from "../../lib/supabase";
import styles from "./BannedPage.module.css";

export default function BannedPage() {
  const onLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>🚫</div>
        <h1 className={styles.title}>Your account is suspended</h1>
        <p className={styles.text}>
          A moderator has banned this account, so you can’t access MarketPlace
          right now.
        </p>
        <button type="button" className={styles.logout} onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
