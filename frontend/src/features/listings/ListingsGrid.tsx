import type { RefObject } from "react";
import ListingCard from "../../components/ListingCard/ListingCard";
import Spinner from "../../components/Spinner/Spinner";
import type { ListingRow } from "./useListings";
import styles from "./ListingsGrid.module.css";

type ListingsGridProps = {
  listings: ListingRow[];
  hasMore: boolean;
  loadingMore: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  onCardClick: () => void;
};

export default function ListingsGrid({
  listings,
  hasMore,
  loadingMore,
  sentinelRef,
  onCardClick,
}: ListingsGridProps) {
  return (
    <>
      <div className={styles.grid}>
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            id={listing.id}
            title={listing.title}
            price={listing.price}
            city={listing.city}
            imageUrl={listing.listing_images?.[0]?.url ?? null}
            onClick={onCardClick}
          />
        ))}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
      )}
      {loadingMore && (
        <div className={styles.loadingMore}>
          <Spinner size="sm" />
          <span>Loading more…</span>
        </div>
      )}
    </>
  );
}
