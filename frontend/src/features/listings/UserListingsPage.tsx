import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams, useNavigationType } from "react-router-dom";
import { fetchListings, fetchPublicUser } from "../../lib/listings/listingsApi";
import { useCurrentUser } from "../../lib/useCurrentUser";
import ListingCard from "../../components/ListingCard/ListingCard";
import styles from "./UserListingsPage.module.css";

type UserListing = {
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  listing_images: { url: string }[] | null;
};

const scrollPositions = new Map<string, number>();

export default function UserListingsPage() {
  const { id } = useParams<{ id: string }>();
  const navType = useNavigationType();
  const { userId: currentUserId } = useCurrentUser();

  const [listings, setListings] = useState<UserListing[]>([]);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwner = !!currentUserId && currentUserId === id;
  const didRestore = useRef(false);

  useEffect(() => {
    if (!id) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      const profile = await fetchPublicUser(id);

      try {
        const { listings: rows } = await fetchListings({
          userId: id,
          sort: "newest",
        });

        if (!active) return;
        if (profile?.name) setOwnerName(profile.name);
        setListings(rows as UserListing[]);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Failed to load listings");
        setListings([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  useLayoutEffect(() => {
    if (didRestore.current) return;
    if (navType !== "POP") {
      didRestore.current = true;
      return;
    }
    if (loading) return;
    const y = id ? (scrollPositions.get(id) ?? 0) : 0;
    window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });
    didRestore.current = true;
  }, [loading, navType, id]);

  const saveScroll = () => {
    if (id) scrollPositions.set(id, window.scrollY);
  };

  const heading = isOwner
    ? "My listings"
    : ownerName
      ? `${ownerName}'s listings`
      : "Listings";

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to={`/profile/${id}`} className={styles.back}>
          ← Back to profile
        </Link>
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
                onClick={saveScroll}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
