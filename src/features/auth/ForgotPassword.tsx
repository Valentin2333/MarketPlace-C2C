import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AuthHeader from './AuthHeader'
import styles from './ForgotPassword.module.css'

type ForgotFormData = {
  email: string
}

export default function ForgotPassword() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotFormData>()

  const onSubmit = async (data: ForgotFormData) => {
    setLoading(true)
    setServerError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setServerError(error.message)
      return
    }
    setSent(true)
  }

  return (
    <div className={styles.page}>
      <div className={styles.cardWrap}>
        <div className={styles.card}>

          <AuthHeader
            title="Forgot password"
            subtitle="We’ll email you a reset link."
          />

          {sent ? (
            <div className={styles.sentBox}>
              <div className={styles.sentIcon}>✉️</div>
              <p className={styles.sentText}>
                If an account exists for <strong>{getValues('email')}</strong>, a password
                reset link is on its way. Check your inbox and spam folder.
              </p>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>

              {serverError && <div className={styles.serverError}>{serverError}</div>}

              <div className={styles.field}>
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  aria-invalid={!!errors.email}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                  })}
                />
                {errors.email && <span className={styles.errorMsg}>{errors.email.message}</span>}
              </div>

              <button className={styles.submit} type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

            </form>
          )}

          <p className={styles.footer}>
            Remembered it? <Link to="/login">Sign in</Link>
          </p>

        </div>
      </div>
    </div>
  )
}
