import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth/useAuth";
import { resendVerificationRequest } from "../../lib/auth/authApi";
import AuthHeader from "./AuthHeader";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import GoogleSignInButton from "../../components/GoogleSignInButton/GoogleSignInButton";
import TurnstileWidget from "../../components/RobotCheckGate/TurnstileWidget";
import { TURNSTILE_SITE_KEY } from "../../components/RobotCheckGate/turnstileScript";
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
  const { login, loginWithGoogle } = useAuth();
  const state = (location.state as LocationState | null) ?? null;

  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { email: state?.registeredEmail ?? "" },
  });

  const onSubmit = async (data: LoginFormData) => {
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setServerError("Please wait for the human verification to finish.");
      return;
    }

    setLoading(true);
    setServerError(null);
    setNeedsVerification(false);
    setResendSent(false);

    try {
      await login(data.email, data.password, turnstileToken ?? undefined);
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
      setTurnstileToken(null);
      setTurnstileKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleCredential = async (credential: string) => {
    setServerError(null);
    setNeedsVerification(false);
    setLoading(true);
    try {
      await loginWithGoogle(credential);
      navigate("/listings");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Google sign-in failed.",
      );
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

            <TurnstileWidget
              onToken={setTurnstileToken}
              onError={() =>
                setServerError("Verification failed. Please try again.")
              }
              resetSignal={turnstileKey}
            />

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

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <GoogleSignInButton
            text="signin_with"
            onCredential={onGoogleCredential}
            onError={setServerError}
          />

          <p className={styles.footer}>
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
