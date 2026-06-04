import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatPrice, formatDate } from '../../lib/format'
import styles from './ListingDetailPage.module.css'

type ListingDetail = {
  id: string
  title: string
  description: string | null
  price: number | null
  city: string | null
  created_at: string | null
  categories: { name: string } | null
  listing_images: { url: string }[] | null
  profiles: { id: string; name: string | null; avatar_url: string | null } | null
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate('/listings')
  }

  const [listing, setListing] = useState<ListingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeImage, setActiveImage] = useState(0)

  useEffect(() => {
    if (!id) return
    let active = true

    const load = async () => {
      setLoading(true)
      setNotFound(false)
      setActiveImage(0)

      const { data, error } = await supabase
        .from('listings')
        .select(
          'id, title, description, price, city, created_at, categories ( name ), listing_images ( url ), profiles ( id, name, avatar_url )',
        )
        .eq('id', id)
        .maybeSingle()

      if (!active) return

      if (error || !data) {
        setNotFound(true)
        setListing(null)
      } else {
        setListing(data as unknown as ListingDetail)
      }
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>Loading…</div>
      </div>
    )
  }

  if (notFound || !listing) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <h2>Listing not found</h2>
          <p>This listing doesn’t exist or has been removed.</p>
          <button type="button" onClick={goBack} className={styles.back}>← Back to listings</button>
        </div>
      </div>
    )
  }

  const images = listing.listing_images ?? []
  const hasImages = images.length > 0
  const seller = listing.profiles

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button type="button" onClick={goBack} className={styles.back}>← Back to listings</button>

        <div className={styles.layout}>
          <div className={styles.gallery}>
            <div className={styles.mainImage}>
              {hasImages ? (
                <img src={images[activeImage]?.url} alt={listing.title} />
              ) : (
                <div className={styles.placeholder}>No image</div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.navArrow} ${styles.navPrev}`}
                    onClick={() =>
                      setActiveImage((i) => (i - 1 + images.length) % images.length)
                    }
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className={`${styles.navArrow} ${styles.navNext}`}
                    onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                    aria-label="Next image"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className={styles.thumbs}>
                {images.map((img, i) => (
                  <button
                    key={`${img.url}-${i}`}
                    type="button"
                    className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ''}`}
                    onClick={() => setActiveImage(i)}
                    aria-label={`Image ${i + 1}`}
                  >
                    <img src={img.url} alt={`${listing.title} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={styles.info}>
            {listing.categories?.name && (
              <span className={styles.badge}>{listing.categories.name}</span>
            )}

            <h1 className={styles.title}>{listing.title}</h1>
            <p className={styles.price}>{formatPrice(listing.price)}</p>
            <p className={styles.meta}>
              📍 {listing.city || 'Location not specified'}
              {listing.created_at && ` · ${formatDate(listing.created_at)}`}
            </p>

            {listing.description && (
              <>
                <div className={styles.divider} />
                <h2 className={styles.sectionTitle}>Description</h2>
                <p className={styles.description}>{listing.description}</p>
              </>
            )}

            <div className={styles.divider} />
            <h2 className={styles.sectionTitle}>Seller</h2>
            {seller ? (
              <Link to={`/profile/${seller.id}`} className={styles.seller}>
                <div className={styles.sellerAvatar}>
                  {seller.avatar_url ? (
                    <img src={seller.avatar_url} alt={seller.name ?? 'Seller'} />
                  ) : (
                    <span>{(seller.name ?? '?').slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <span className={styles.sellerName}>{seller.name || 'Unnamed user'}</span>
              </Link>
            ) : (
              <p className={styles.meta}>Unknown seller</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
