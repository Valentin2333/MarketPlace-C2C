import { forwardRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import styles from "./PasswordInput.module.css";

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.6 6.6C4.1 8.2 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.4-1M9.9 4.2A12 12 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...rest }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className={styles.wrap}>
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={[styles.input, className].filter(Boolean).join(" ")}
          {...rest}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    );
  },
);

export default PasswordInput;
