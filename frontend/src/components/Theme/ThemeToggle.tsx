import { useTheme } from "./useTheme";
import styles from "./ThemeToggle.module.css";

type ThemeToggleProps = {
  variant?: "icon" | "full";
  className?: string;
};

function SunIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function ThemeToggle({
  variant = "icon",
  className = "",
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";
  const targetLabel = isDark ? "Light mode" : "Dark mode";
  const ariaLabel = isDark ? "Switch to light theme" : "Switch to dark theme";

  if (variant === "full") {
    return (
      <button
        type="button"
        className={`${styles.full} ${className}`}
        onClick={toggleTheme}
        aria-label={ariaLabel}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
        <span>{targetLabel}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.iconBtn} ${className}`}
      onClick={toggleTheme}
      aria-label={ariaLabel}
      title={targetLabel}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
