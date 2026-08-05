import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/useAuth";
import { friendlyAuthError } from "../../lib/authErrors";
import AuthHeader from "./AuthHeader";
import styles from "./Login.module.css";

type LoginFormData = {
  email: string;
  password: string;
};

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setServerError(null);

    try {
      await login(data.email, data.password);
      navigate("/listings");
    } catch (err) {
      setServerError(
        friendlyAuthError(err instanceof Error ? err.message : ""),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.cardWrap}>
        <div className={styles.card}>
          <AuthHeader
            title="Welcome back"
            subtitle="Sign in to your account."
          />

          <form
            className={styles.form}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {serverError && (
              <div className={styles.serverError}>{serverError}</div>
            )}

            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^\S+@\S+\.\S+$/,
                    message: "Enter a valid email",
                  },
                })}
              />
              {errors.email && (
                <span className={styles.errorMsg}>{errors.email.message}</span>
              )}
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="password">Password</label>
                <Link to="/forgot-password" className={styles.forgotLink}>
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="Your password"
                aria-invalid={!!errors.password}
                {...register("password", {
                  required: "Password is required",
                })}
              />
              {errors.password && (
                <span className={styles.errorMsg}>
                  {errors.password.message}
                </span>
              )}
            </div>

            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className={styles.footer}>
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
