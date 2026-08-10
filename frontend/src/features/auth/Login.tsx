import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/useAuth";
import { resendVerificationRequest } from "../../lib/auth/authApi";
import AuthHeader from "./AuthHeader";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import styles from "./Login.module.css";

type LoginFormData = {
  email: string;
  password: string;
};

type LocationState = {
  justRegistered?: boolean;
  registeredEmail?: string;
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const state = (location.state as LocationState | null) ?? null;

  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { email: state?.registeredEmail ?? "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setServerError(null);
    setNeedsVerification(false);
    setResendSent(false);

    try {
      await login(data.email, data.password);
      navigate("/listings");
    } catch (err) {
      const code = (err as { code?: string } | undefined)?.code;
      if (code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerification(true);
      } else {
        setServerError(
          err instanceof Error ? err.message : "Invalid email or password.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    const email = getValues("email");
    if (!email) return;

    setResending(true);
    try {
      await resendVerificationRequest(email);
      setResendSent(true);
    } catch {
      // Resend failures aren't shown separately - the endpoint always
      // responds successfully by design, so this only fails on network
      // issues, which the person will notice from the lack of email anyway.
    } finally {
      setResending(false);
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
            {state?.justRegistered && !serverError && !needsVerification && (
              <div className={styles.infoBanner}>
                Account created! Check your email to verify your address
                before signing in.
              </div>
            )}

            {serverError && (
              <div className={styles.serverError}>{serverError}</div>
            )}

            {needsVerification && (
              <div className={styles.serverError}>
                Please verify your email before logging in.
                {resendSent ? (
                  <div className={styles.resendConfirm}>
                    Verification email sent — check your inbox.
                  </div>
                ) : (
                  <button
                    type="button"
                    className={styles.resendLink}
                    onClick={onResend}
                    disabled={resending}
                  >
                    {resending ? "Sending..." : "Resend verification email"}
                  </button>
                )}
              </div>
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
              <PasswordInput
                id="password"
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
