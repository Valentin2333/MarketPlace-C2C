import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { clearListingsCache } from './useListings'
import styles from './CreateListingModal.module.css'

type Category = {
  id: number
  name: string
}

type CreateListingForm = {
  title: string
  description: string
  price: string
  categoryId: string
  city: string
}

type CreateListingModalProps = {
  open: boolean
  onClose: () => void
}

export default function CreateListingModal({ open, onClose }: CreateListingModalProps) {
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateListingForm>()

  const selectedCategory = watch('categoryId')

  useEffect(() => {
    if (!open || categories.length > 0) return
    supabase
      .from('categories')
      .select('id, name')
      .order('name')
      .then(({ data }) => setCategories((data ?? []) as Category[]))
  }, [open, categories.length])

  useEffect(() => {
    if (!open) return
    let active = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (active && data?.city) setValue('city', data.city)
        })
    })
    return () => {
      active = false
    }
  }, [open, setValue])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const close = () => {
    reset()
    setServerError(null)
    onClose()
  }

  const onSubmit = async (values: CreateListingForm) => {
    setSubmitting(true)
    setServerError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSubmitting(false)
      setServerError('You must be signed in to create a listing.')
      return
    }

    const { data, error } = await supabase
      .from('listings')
      .insert({
        title: values.title.trim(),
        description: values.description.trim(),
        price: Number(values.price),
        city: values.city.trim(),
        category_id: Number(values.categoryId),
        user_id: user.id,
        status: 'active',
      })
      .select('id')
      .single()

    setSubmitting(false)

    if (error || !data) {
      setServerError(error?.message ?? 'Could not create listing.')
      return
    }

    clearListingsCache()
    reset()
    onClose()
    navigate(`/listings/${data.id}`)
  }

  return (
    <>
      <div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ''}`}
        onClick={close}
      />

      <div
        className={`${styles.modal} ${open ? styles.modalOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Create a listing"
        aria-hidden={!open}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Create a listing</h2>
          <button type="button" className={styles.close} onClick={close} aria-label="Close">
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && <div className={styles.serverError}>{serverError}</div>}

          <div className={styles.field}>
            <label htmlFor="cl-title">Title</label>
            <input
              id="cl-title"
              type="text"
              placeholder="e.g. iPhone 13, 128GB"
              aria-invalid={!!errors.title}
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 3, message: 'Title must be at least 3 characters' },
              })}
            />
            {errors.title && <span className={styles.errorMsg}>{errors.title.message}</span>}
          </div>

          <div className={styles.field}>
            <label>Category</label>
            <input type="hidden" {...register('categoryId', { required: 'Please choose a category' })} />
            <div className={styles.chips}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.chip} ${selectedCategory === String(c.id) ? styles.chipActive : ''}`}
                  onClick={() => setValue('categoryId', String(c.id), { shouldValidate: true })}
                >
                  {c.name}
                </button>
              ))}
            </div>
            {errors.categoryId && (
              <span className={styles.errorMsg}>{errors.categoryId.message}</span>
            )}
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="cl-price">Price (€)</label>
              <input
                id="cl-price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="e.g. 250"
                aria-invalid={!!errors.price}
                {...register('price', {
                  required: 'Price is required',
                  validate: (v) => Number(v) > 0 || 'Price must be greater than 0',
                })}
              />
              {errors.price && <span className={styles.errorMsg}>{errors.price.message}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="cl-city">City</label>
              <input
                id="cl-city"
                type="text"
                placeholder="e.g. Sofia"
                aria-invalid={!!errors.city}
                {...register('city', { required: 'City is required' })}
              />
              {errors.city && <span className={styles.errorMsg}>{errors.city.message}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="cl-description">Description</label>
            <textarea
              id="cl-description"
              rows={5}
              placeholder="Describe the item, its condition, what's included…"
              aria-invalid={!!errors.description}
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 20, message: 'Description must be at least 20 characters' },
              })}
            />
            {errors.description && (
              <span className={styles.errorMsg}>{errors.description.message}</span>
            )}
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancel} onClick={close}>
              Cancel
            </button>
            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? 'Publishing…' : 'Publish listing'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
