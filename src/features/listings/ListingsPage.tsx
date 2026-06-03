import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import ListingCard from '../../components/ListingCard/ListingCard'
import styles from './ListingsPage.module.css'

type ListingRow = {
  id: string
  title: string
  price: number | null
  city: string | null
  listing_images: { url: string }[] | null
}

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price, city, listing_images ( url )')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (!active) return

      if (error) {
        setError(error.message)
        setListings([])
      } else {
        setListings((data ?? []) as ListingRow[])
      }
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Listings</h1>

        {loading ? (
          <div className={styles.state}>Loading listings…</div>
        ) : error ? (
          <div className={styles.stateError}>{error}</div>
        ) : listings.length === 0 ? (
          <div className={styles.state}>No listings yet.</div>
        ) : (
          <div className={styles.grid}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
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
