import ListingsToolbar from "./ListingsToolbar";
import ListingsGrid from "./ListingsGrid";
import FiltersDrawer from "./FiltersDrawer";
import { useListings } from "./useListings";
import styles from "./ListingsPage.module.css";

export default function ListingsPage() {
  const {
    search,
    setSearch,
    draft,
    updateDraft,
    drawerOpen,
    openDrawer,
    closeDrawer,
    applyFilters,
    clearFilters,
    activeCount,
    categories,
    cities,
    listings,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    sentinelRef,
    saveScroll,
  } = useListings();

  const count = total ?? listings.length;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Listings</h1>

        <ListingsToolbar
          search={search}
          onSearchChange={setSearch}
          activeCount={activeCount}
          onOpenFilters={openDrawer}
        />

        {loading ? (
          <div className={styles.state}>Loading listings…</div>
        ) : error ? (
          <div className={styles.stateError}>{error}</div>
        ) : listings.length === 0 ? (
          <div className={styles.state}>No listings found.</div>
        ) : (
          <>
            <p className={styles.resultsInfo}>
              {count} {count === 1 ? "listing" : "listings"}
            </p>
            <ListingsGrid
              listings={listings}
              hasMore={hasMore}
              loadingMore={loadingMore}
              sentinelRef={sentinelRef}
              onCardClick={saveScroll}
            />
          </>
        )}
      </div>

      <FiltersDrawer
        open={drawerOpen}
        draft={draft}
        categories={categories}
        cities={cities}
        onChange={updateDraft}
        onApply={applyFilters}
        onClear={clearFilters}
        onClose={closeDrawer}
      />
    </div>
  );
}
