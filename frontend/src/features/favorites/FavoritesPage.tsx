import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchListings, type ListingSummary } from '../../lib/listings/listingsApi'
import { useFavorites } from '../../components/Favorites/useFavorites'
import ListingCard from '../../components/ListingCard/ListingCard'
import styles from './FavoritesPage.module.css'

export default function FavoritesPage() {
  const { favoriteIds, isFavorite, isLoggedIn, ready } = useFavorites()
  const [listings, setListings] = useState<ListingSummary[]>([])
  const [loading, setLoading] = useState(true)

  const favoriteIdsRef = useRef(favoriteIds)
  favoriteIdsRef.current = favoriteIds

  useEffect(() => {
    if (!ready) return

    if (!isLoggedIn) {
      setListings([])
      setLoading(false)
      return
    }

    const ids = favoriteIdsRef.current
    if (ids.length === 0) {
      setListings([])
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)

    const load = async () => {
      const { listings: rows } = await fetchListings({ ids })
      if (!active) return
      setListings(rows)
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [ready, isLoggedIn])

  if (!ready || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.heading}>Favorites</h1>
          <div className={styles.state}>Loading…</div>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.heading}>Favorites</h1>
          <div className={styles.state}>
            <p>Sign in to save and view your favorite listings.</p>
            <Link to="/login" className={styles.cta}>Log in</Link>
          </div>
        </div>
      </div>
    )
  }

  const order = new Map(favoriteIds.map((fid, i) => [fid, i]))
  const visible = listings
    .filter((l) => isFavorite(l.id))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Favorites</h1>

        {visible.length === 0 ? (
          <div className={styles.state}>
            <p>No favorites yet. Tap the heart on any listing to save it here.</p>
            <Link to="/listings" className={styles.cta}>Browse listings</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {visible.map((listing) => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                price={listing.price}
                city={listing.city}
                imageUrl={listing.listing_images?.[0]?.url ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
