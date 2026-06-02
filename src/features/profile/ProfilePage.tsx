import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import styles from './ProfilePage.module.css'

type Profile = {
  id: string
  name: string | null
  city: string | null
  avatar_url: string | null
  role: string | null
}

type ProfileFormData = {
  name: string
  city: string
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>()

  const isOwner = !!currentUserId && currentUserId === id

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (!id) return
    let active = true

    const load = async () => {
      setLoading(true)
      setNotFound(false)
      setSaveMsg(null)
      setServerError(null)

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, city, avatar_url, role')
        .eq('id', id)
        .maybeSingle()

      if (!active) return

      if (error || !data) {
        setNotFound(true)
        setProfile(null)
      } else {
        setProfile(data)
        reset({ name: data.name ?? '', city: data.city ?? '' })
      }
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [id, reset])

  const onSave = async (values: ProfileFormData) => {
    if (!isOwner || !id) return
    setSaving(true)
    setServerError(null)
    setSaveMsg(null)

    const name = values.name.trim()
    const city = values.city.trim() || null

    const { error } = await supabase
      .from('profiles')
      .update({ name, city })
      .eq('id', id)

    setSaving(false)

    if (error) {
      setServerError(error.message)
      return
    }

    setProfile((prev) => (prev ? { ...prev, name, city } : prev))
    setSaveMsg('Profile updated.')
  }

  const onAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !isOwner || !id) return

    if (!file.type.startsWith('image/')) {
      setServerError('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setServerError('Image must be smaller than 5 MB.')
      return
    }

    setUploading(true)
    setServerError(null)
    setSaveMsg(null)

    const path = `${id}/avatar`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setUploading(false)
      setServerError(uploadError.message)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(path)

    const bustedUrl = `${publicUrl}?v=${Date.now()}`

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: bustedUrl })
      .eq('id', id)

    setUploading(false)

    if (updateError) {
      setServerError(updateError.message)
      return
    }

    setProfile((prev) => (prev ? { ...prev, avatar_url: bustedUrl } : prev))
    setSaveMsg('Avatar updated.')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const initials = (profile?.name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>Loading profile…</div>
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <h2>Profile not found</h2>
          <p>This user doesn’t exist or has been removed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.cardWrap}>
        <div className={styles.card}>

          <div className={styles.headerRow}>
            <div className={styles.avatarBlock}>
              <div className={styles.avatar}>
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name ?? 'Avatar'} />
                ) : (
                  <span className={styles.avatarFallback}>{initials}</span>
                )}
              </div>

              {isOwner && (
                <>
                  <button
                    type="button"
                    className={styles.avatarEdit}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    aria-label="Change avatar"
                    title="Change avatar"
                  >
                    {uploading ? '…' : '✎'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onAvatarChange}
                    hidden
                  />
                </>
              )}
            </div>

            <div className={styles.identity}>
              <h1 className={styles.name}>{profile.name || 'Unnamed user'}</h1>
              <p className={styles.city}>
                {profile.city ? `📍 ${profile.city}` : 'No location set'}
              </p>
              {profile.role === 'admin' && <span className={styles.badge}>Admin</span>}
            </div>
          </div>

          {serverError && <div className={styles.serverError}>{serverError}</div>}
          {saveMsg && <div className={styles.successMsg}>{saveMsg}</div>}

          {isOwner ? (
            <>
              <div className={styles.divider} />

              <form className={styles.form} onSubmit={handleSubmit(onSave)} noValidate>
                <h3 className={styles.sectionTitle}>Edit profile</h3>

                <div className={styles.field}>
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    aria-invalid={!!errors.name}
                    {...register('name', {
                      required: 'Name is required',
                      minLength: { value: 2, message: 'Name must be at least 2 characters' },
                    })}
                  />
                  {errors.name && <span className={styles.errorMsg}>{errors.name.message}</span>}
                </div>

                <div className={styles.field}>
                  <label htmlFor="city">City</label>
                  <input
                    id="city"
                    type="text"
                    placeholder="e.g. Sofia"
                    {...register('city')}
                  />
                </div>

                <button className={styles.submit} type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className={styles.divider} />
              <div className={styles.readonly}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Name</span>
                  <span className={styles.infoValue}>{profile.name || '—'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>City</span>
                  <span className={styles.infoValue}>{profile.city || '—'}</span>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
