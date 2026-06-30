import { Link } from "react-router-dom";
import BrandMark from "../../components/BrandMark/BrandMark";
import styles from "./AuthHeader.module.css";

type AuthHeaderProps = {
  title: string;
  subtitle: string;
};

export default function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  return (
    <div className={styles.header}>
      <Link to="/" className={styles.logo}>
        <BrandMark className={styles.logoIcon} />
        MarketPlace
      </Link>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </div>
  );
}
