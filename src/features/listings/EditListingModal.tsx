import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../../lib/supabase'
import { clearListingsCache } from './useListings'
import { useToast } from '../../components/Toast/useToast'
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

type ExistingImage = {
  key: string
  kind: 'existing'
  id: number
  url: string
}

type NewImage = {
  key: string
  kind: 'new'
  file: File
  preview: string
}

type EditImage = ExistingImage | NewImage

type EditListingForm = {
  title: string
  description: string
  price: string
  categoryId: string
  city: string
}

type EditListingModalProps = {
  listingId: string
  open: boolean
  onClose: () => void
  onSaved: () => void
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

function pathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`
  const i = url.indexOf(marker)
  return i === -1 ? null : url.slice(i + marker.length)
}

export default function EditListingModal({ listingId, open, onClose, onSaved }: EditListingModalProps) {
  const toast = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<EditImage[]>([])
  const [mainKey, setMainKey] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const originalRef = useRef<{ id: number; url: string }[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditListingForm>()

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
    setLoaded(false)

    const load = async () => {
      const { data: row } = await supabase
        .from('listings')
        .select('title, description, price, city, category_id')
        .eq('id', listingId)
        .single()

      const { data: imgRows } = await supabase
        .from('listing_images')
        .select('id, url, position')
        .eq('listing_id', listingId)
        .order('position', { ascending: true })

      if (!active) return

      if (row) {
        reset({
          title: row.title ?? '',
          description: row.description ?? '',
          price: row.price != null ? String(row.price) : '',
          categoryId: row.category_id != null ? String(row.category_id) : '',
          city: row.city ?? '',
        })
      }

      const existing: ExistingImage[] = ((imgRows ?? []) as { id: number; url: string }[]).map(
        (r) => ({ key: `e-${r.id}`, kind: 'existing', id: r.id, url: r.url }),
      )
      originalRef.current = existing.map((e) => ({ id: e.id, url: e.url }))
      setImages(existing)
      setMainKey(existing[0]?.key ?? null)
      setLoaded(true)
    }

    load()
    return () => {
      active = false
    }
  }, [open, listingId, reset])

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

  const revokeNew = (list: EditImage[]) => {
    list.forEach((img) => {
      if (img.kind === 'new') URL.revokeObjectURL(img.preview)
    })
  }

  const addFiles = (fileList: FileList) => {
    setServerError(null)
    const valid: NewImage[] = []
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith('image/')) {
        setServerError('Only image files are allowed.')
        continue
      }
      if (file.size > MAX_SIZE) {
        setServerError('Each image must be smaller than 15 MB.')
        continue
      }
      valid.push({ key: crypto.randomUUID(), kind: 'new', file, preview: URL.createObjectURL(file) })
    }

    setImages((prev) => {
      const next = [...prev, ...valid].slice(0, MAX_IMAGES)
      setMainKey((current) => current ?? next[0]?.key ?? null)
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

  const removeImage = (key: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.key === key)
      if (target && target.kind === 'new') URL.revokeObjectURL(target.preview)
      const next = prev.filter((img) => img.key !== key)
      setMainKey((current) => (current === key ? next[0]?.key ?? null : current))
      return next
    })
  }

  const close = () => {
    revokeNew(images)
    setImages([])
    setMainKey(null)
    setServerError(null)
    onClose()
  }

  const onSubmit = async (values: EditListingForm) => {
    setSubmitting(true)
    setServerError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setSubmitting(false)
      toast.error('You must be signed in to edit a listing.')
      return
    }

    const { error: updateError } = await supabase
      .from('listings')
      .update({
        title: values.title.trim(),
        description: values.description.trim(),
        price: Number(values.price),
        city: values.city.trim(),
        category_id: Number(values.categoryId),
      })
      .eq('id', listingId)

    if (updateError) {
      setSubmitting(false)
      toast.error(updateError.message)
      return
    }

    const ordered = [...images].sort((a, b) => {
      if (a.key === mainKey) return -1
      if (b.key === mainKey) return 1
      return 0
    })

    const rows: { listing_id: string; url: string; position: number }[] = []

    for (let i = 0; i < ordered.length; i++) {
      const img = ordered[i]
      if (img.kind === 'existing') {
        rows.push({ listing_id: listingId, url: img.url, position: i })
        continue
      }
      const { blob, ext, type } = await compressImage(img.file)
      const path = `${user.id}/${listingId}/${i}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: type, upsert: false })
      if (uploadError) {
        setSubmitting(false)
        toast.error(uploadError.message)
        return
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path)
      rows.push({ listing_id: listingId, url: publicUrl, position: i })
    }

    const keptIds = new Set(
      images.filter((img): img is ExistingImage => img.kind === 'existing').map((img) => img.id),
    )
    const removedPaths = originalRef.current
      .filter((o) => !keptIds.has(o.id))
      .map((o) => pathFromUrl(o.url))
      .filter((p): p is string => !!p)

    if (removedPaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(removedPaths)
    }

    await supabase.from('listing_images').delete().eq('listing_id', listingId)

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from('listing_images').insert(rows)
      if (insertError) {
        setSubmitting(false)
        toast.error(insertError.message)
        return
      }
    }

    clearListingsCache()
    revokeNew(images)
    setImages([])
    setMainKey(null)
    setSubmitting(false)
    toast.success('Listing updated.')
    onSaved()
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
        aria-label="Edit listing"
        aria-hidden={!open}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>Edit listing</h2>
          <button type="button" className={styles.close} onClick={close} aria-label="Close">
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          {serverError && <div className={styles.serverError}>{serverError}</div>}

          <div className={styles.field}>
            <label htmlFor="el-title">Title</label>
            <input
              id="el-title"
              type="text"
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
              <label htmlFor="el-price">Price (€)</label>
              <input
                id="el-price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                onWheel={(e) => e.currentTarget.blur()}
                aria-invalid={!!errors.price}
                {...register('price', {
                  required: 'Price is required',
                  validate: (v) => Number(v) > 0 || 'Price must be greater than 0',
                })}
              />
              {errors.price && <span className={styles.errorMsg}>{errors.price.message}</span>}
            </div>

            <div className={styles.field}>
              <label htmlFor="el-city">City</label>
              <input
                id="el-city"
                type="text"
                aria-invalid={!!errors.city}
                {...register('city', { required: 'City is required' })}
              />
              {errors.city && <span className={styles.errorMsg}>{errors.city.message}</span>}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="el-description">Description</label>
            <textarea
              id="el-description"
              rows={5}
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
                        key={img.key}
                        className={`${styles.thumb} ${img.key === mainKey ? styles.thumbMain : ''}`}
                        onClick={() => setMainKey(img.key)}
                        title={img.key === mainKey ? 'Main photo' : 'Set as main photo'}
                      >
                        <img src={img.kind === 'existing' ? img.url : img.preview} alt="" />
                        {img.key === mainKey && <span className={styles.mainBadge}>Main</span>}
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={(e) => {
                            e.stopPropagation()
                            removeImage(img.key)
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
            <button type="submit" className={styles.submit} disabled={submitting || !loaded}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
