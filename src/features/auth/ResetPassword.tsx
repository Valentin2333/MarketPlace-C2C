import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import AuthHeader from "./AuthHeader";
import styles from "./ResetPassword.module.css";

type ResetFormData = {
  password: string;
  confirmPassword: string;
};

export default function ResetPassword() {
  const navigate = useNavigate();

  const [status, setStatus] = useState<"checking" | "ready" | "invalid">(
    "checking",
  );
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetFormData>();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStatus("ready");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus("ready");
        return;
      }
      timer = setTimeout(() => {
        supabase.auth.getSession().then(({ data: { session: s } }) => {
          setStatus((prev) =>
            prev === "ready" ? prev : s ? "ready" : "invalid",
          );
        });
      }, 1500);
    });

    return () => {
      subscription.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const onSubmit = async (data: ResetFormData) => {
    setLoading(true);
    setServerError(null);

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    setLoading(false);

    if (error) {
      setServerError(error.message);
      return;
    }

    setDone(true);
    setTimeout(() => navigate("/login"), 2500);
  };

  return (
    <div className={styles.page}>
      <div className={styles.cardWrap}>
        <div className={styles.card}>
          <AuthHeader
            title="Set a new password"
            subtitle="Choose a strong password for your account."
          />

          {done ? (
            <div className={styles.sentBox}>
              <div className={styles.sentIcon}>✅</div>
              <p className={styles.sentText}>
                Your password has been updated. Redirecting you to sign in…
              </p>
            </div>
          ) : status === "invalid" ? (
            <div className={styles.sentBox}>
              <p className={styles.sentText}>
                This reset link is invalid or has expired. Request a new one to
                continue.
              </p>
              <Link to="/forgot-password" className={styles.inlineBtn}>
                Request a new link
              </Link>
            </div>
          ) : status === "checking" ? (
            <div className={styles.sentBox}>
              <p className={styles.sentText}>Verifying your reset link…</p>
            </div>
          ) : (
            <form
              className={styles.form}
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {serverError && (
                <div className={styles.serverError}>{serverError}</div>
              )}

              <div className={styles.field}>
                <label htmlFor="password">New password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  aria-invalid={!!errors.password}
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                />
                {errors.password && (
                  <span className={styles.errorMsg}>
                    {errors.password.message}
                  </span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repeat your password"
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (val) =>
                      val === watch("password") || "Passwords do not match",
                  })}
                />
                {errors.confirmPassword && (
                  <span className={styles.errorMsg}>
                    {errors.confirmPassword.message}
                  </span>
                )}
              </div>

              <button
                className={styles.submit}
                type="submit"
                disabled={loading}
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          )}

          <p className={styles.footer}>
            Back to <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
