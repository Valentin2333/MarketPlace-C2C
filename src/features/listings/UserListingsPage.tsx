import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import ListingCard from '../../components/ListingCard/ListingCard'
import styles from './UserListingsPage.module.css'

type UserListing = {
  id: string
  title: string
  price: number | null
  city: string | null
  listing_images: { url: string }[] | null
}

export default function UserListingsPage() {
  const { id } = useParams<{ id: string }>()

  const [listings, setListings] = useState<UserListing[]>([])
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (active) setIsOwner(!!user && user.id === id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', id)
        .maybeSingle()

      const { data, error: listError } = await supabase
        .from('listings')
        .select('id, title, price, city, created_at, listing_images ( url, position )')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .order('position', { referencedTable: 'listing_images', ascending: true })

      if (!active) return

      if (profile?.name) setOwnerName(profile.name)

      if (listError) {
        setError(listError.message)
        setListings([])
      } else {
        setListings((data ?? []) as unknown as UserListing[])
      }
      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [id])

  const heading = isOwner ? 'My listings' : ownerName ? `${ownerName}'s listings` : 'Listings'

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to={`/profile/${id}`} className={styles.back}>← Back to profile</Link>
        <h1 className={styles.heading}>{heading}</h1>

        {loading ? (
          <div className={styles.state}>Loading…</div>
        ) : error ? (
          <div className={styles.stateError}>{error}</div>
        ) : listings.length === 0 ? (
          <div className={styles.state}>No listings yet.</div>
        ) : (
          <div className={styles.grid}>
            {listings.map((listing) => (
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
