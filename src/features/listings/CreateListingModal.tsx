import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { clearListingsCache } from './useListings'
import styles from './CreateListingModal.module.css'

const BUCKET = 'listing-images'
const MAX_IMAGES = 5
const MAX_SIZE = 15 * 1024 * 1024
const MAX_DIM = 1600
const QUALITY = 0.8

type Category = {
  id: number
  name: string
}

type PendingImage = {
  id: string
  file: File
  preview: string
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

async function compressImage(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
  const fallback = () => {
    const ext = file.name.includes('.') ? (file.name.split('.').pop() as string) : 'jpg'
    return { blob: file as Blob, ext, type: file.type || 'application/octet-stream' }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return fallback()
  }

  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return fallback()
  }
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', QUALITY),
  )
  if (!blob) return fallback()
  return { blob, ext: 'jpg', type: 'image/jpeg' }
}

export default function CreateListingModal({ open, onClose }: CreateListingModalProps) {
  const navigate = useNavigate()

  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<PendingImage[]>([])
  const [mainId, setMainId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const addFiles = (fileList: FileList) => {
    setServerError(null)
    const valid: PendingImage[] = []
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) {
        setServerError('Only image files are allowed.')
        continue
      }
      if (file.size > MAX_SIZE) {
        setServerError('Each image must be smaller than 15 MB.')
        continue
      }
      valid.push({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) })
    }

    setImages((prev) => {
      const next = [...prev, ...valid].slice(0, MAX_IMAGES)
      setMainId((current) => current ?? next[0]?.id ?? null)
      return next
    })
  }

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      const next = prev.filter((img) => img.id !== id)
      setMainId((current) => (current === id ? next[0]?.id ?? null : current))
      return next
    })
  }

  const clearImages = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview))
    setImages([])
    setMainId(null)
  }

  const close = () => {
    clearImages()
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

    const { data: created, error } = await supabase
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

    if (error || !created) {
      setSubmitting(false)
      setServerError(error?.message ?? 'Could not create listing.')
      return
    }

    if (images.length > 0) {
      const ordered = [...images].sort((a, b) => {
        if (a.id === mainId) return -1
        if (b.id === mainId) return 1
        return 0
      })

      const rows: { listing_id: string; url: string; position: number }[] = []

      for (let i = 0; i < ordered.length; i++) {
        const { blob, ext, type } = await compressImage(ordered[i].file)
        const path = `${user.id}/${created.id}/${i}-${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: type, upsert: false })

        if (uploadError) {
          setSubmitting(false)
          setServerError(uploadError.message)
          return
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(BUCKET).getPublicUrl(path)
        rows.push({ listing_id: created.id, url: publicUrl, position: i })
      }

      const { error: imageError } = await supabase.from('listing_images').insert(rows)
      if (imageError) {
        setSubmitting(false)
        setServerError(imageError.message)
        return
      }
    }

    clearListingsCache()
    clearImages()
    reset()
    setSubmitting(false)
    onClose()
    navigate(`/listings/${created.id}`)
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

          <div className={styles.field}>
            <label>Photos</label>
            <div className={styles.images}>
              {images.length < MAX_IMAGES && (
                <div
                  className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={() => setDragOver(false)}
                >
                  <span className={styles.dropzoneIcon}>🖼️</span>
                  <span>Click to upload or drag &amp; drop</span>
                  <span className={styles.dropzoneHint}>
                    Up to {MAX_IMAGES} photos · {images.length}/{MAX_IMAGES} added
                  </span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onFileInput}
                hidden
              />

              {images.length > 0 && (
                <>
                  <div className={styles.thumbs}>
                    {images.map((img) => (
                      <div
                        key={img.id}
                        className={`${styles.thumb} ${img.id === mainId ? styles.thumbMain : ''}`}
                        onClick={() => setMainId(img.id)}
                        title={img.id === mainId ? 'Main photo' : 'Set as main photo'}
                      >
                        <img src={img.preview} alt="" />
                        {img.id === mainId && <span className={styles.mainBadge}>Main</span>}
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(img.id)
                          }}
                          aria-label="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <span className={styles.dropzoneHint}>Tap a photo to set it as the main one.</span>
                </>
              )}
            </div>
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
