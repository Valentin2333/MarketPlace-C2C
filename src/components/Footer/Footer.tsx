import { Link } from "react-router-dom";
import BrandMark from '../BrandMark/BrandMark'
import styles from "./Footer.module.css";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link to="/" className={styles.logo}>
            <BrandMark className={styles.logoIcon} />
            <span className={styles.logoText}>MarketPlace</span>
          </Link>
          <p className={styles.description}>
            A free C2C marketplace to buy and sell secondhand items locally -
            electronics, furniture, clothing and more. Browse by category, city
            and price, then deal directly with sellers.
          </p>
        </div>

        <nav className={styles.links} aria-label="Footer">
          <span className={styles.linksTitle}>Help &amp; Legal</span>
          <Link to="/faq" className={styles.link}>
            FAQ
          </Link>
          <Link to="/terms" className={styles.link}>
            Terms &amp; Conditions
          </Link>
          <Link to="/privacy" className={styles.link}>
            Privacy Policy
          </Link>
        </nav>
      </div>

      <div className={styles.bottomBar}>
        <p className={styles.copyright}>
          © {year} MarketPlace. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
