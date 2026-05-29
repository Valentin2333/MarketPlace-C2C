import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

type LoginFormData = {
  email: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>()

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)
    setServerError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    setLoading(false)

    if (error) {
      setServerError('Invalid email or password.')
      return
    }

    navigate('/listings')
  }

  return (
    <div>
      <div>
        <div>
          <div>🛒</div>
          Markt
        </div>
        <h1>Welcome back</h1>
        <p>Sign in to your account.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && <p>{serverError}</p>}

        <div>
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
          {errors.email && <span>{errors.email.message}</span>}
        </div>

        <div>
          <div>
            <label htmlFor="password">Password</label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="Your password"
            aria-invalid={!!errors.password}
            {...register('password', {
              required: 'Password is required',
            })}
          />
          {errors.password && <span>{errors.password.message}</span>}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p>
        Don't have an account? <Link to="/register">Create one</Link>
      </p>
    </div>
  )
}
