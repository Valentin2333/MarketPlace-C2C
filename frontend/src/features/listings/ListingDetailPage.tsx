import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  fetchListing,
  deleteListingRequest,
  type ListingDetail,
} from "../../lib/listings/listingsApi";
import { deleteImages } from "../../lib/uploads/uploadsApi";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { formatPrice, formatDate } from "../../lib/format";
import { clearListingsCache } from "./useListings";
import { useToast } from "../../components/Toast/useToast";
import EditListingModal from "./EditListingModal";
import ConfirmModal from "./ConfirmModal";
import ReportListingModal from "./ReportListingModal";
import FavoriteButton from "../../components/Favorites/FavoriteButton";

import styles from "./ListingDetailPage.module.css";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const goBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/listings");
  };

  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const { userId: currentUserId, isAdmin } = useCurrentUser();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);

  const reqIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!id) return;
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setNotFound(false);
    setActiveImage(0);

    try {
      const data = await fetchListing(id);
      if (reqId !== reqIdRef.current) return;
      setListing(data);
    } catch {
      if (reqId !== reqIdRef.current) return;
      setNotFound(true);
      setListing(null);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    if (!listing) return;

    setDeleting(true);

    const urls = (listing.listing_images ?? []).map((img) => img.url);

    try {
      await deleteListingRequest(listing.id);
    } catch (err) {
      setDeleting(false);
      setConfirmOpen(false);
      toast.error(err instanceof Error ? err.message : "Could not delete listing.");
      return;
    }

    if (urls.length > 0) {
      await deleteImages(urls).catch(() => {});
    }

    setDeleting(false);
    clearListingsCache();
    toast.success("Listing deleted.");
    navigate("/listings");
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>Loading…</div>
      </div>
    );
  }

  if (notFound || !listing) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <h2>Listing not found</h2>
          <p>This listing doesn’t exist or has been removed.</p>
          <button type="button" onClick={goBack} className={styles.back}>
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const images = listing.listing_images ?? [];
  const hasImages = images.length > 0;
  const seller = listing.profiles;
  const isOwner = !!currentUserId && seller?.id === currentUserId;
  const canDelete = isOwner || isAdmin;

  const handleReport = async (reason: string) => {
    if (!listing || !currentUserId) return;
    setReporting(true);

    const { error } = await supabase.from("reports").insert({
      listing_id: listing.id,
      reporter_id: currentUserId,
      reason,
    });

    setReporting(false);
    setReportOpen(false);

    if (error) {
      if (error.code === "23505") {
        toast.info("You’ve already reported this listing.");
        return;
      }
      toast.error(error.message);
      return;
    }

    toast.success("Thanks - we’ll review this listing.");
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button type="button" onClick={goBack} className={styles.back}>
          ← Back
        </button>

        <div className={styles.layout}>
          <div className={styles.gallery}>
            <div className={styles.mainImage}>
              {hasImages ? (
                <img src={images[activeImage]?.url} alt={listing.title} />
              ) : (
                <div className={styles.placeholder}>No image</div>
              )}

              <FavoriteButton listingId={listing.id} variant="detail" />

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    className={`${styles.navArrow} ${styles.navPrev}`}
                    onClick={() =>
                      setActiveImage(
                        (i) => (i - 1 + images.length) % images.length,
                      )
                    }
                    aria-label="Previous image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className={`${styles.navArrow} ${styles.navNext}`}
                    onClick={() =>
                      setActiveImage((i) => (i + 1) % images.length)
                    }
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
                    className={`${styles.thumb} ${i === activeImage ? styles.thumbActive : ""}`}
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
              📍 {listing.city || "Location not specified"}
              {listing.created_at && ` · ${formatDate(listing.created_at)}`}
            </p>

            {canDelete && (
              <div className={styles.ownerActions}>
                {isOwner && (
                  <button
                    type="button"
                    className={styles.editBtn}
                    onClick={() => setEditOpen(true)}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => setConfirmOpen(true)}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}

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
                    <img
                      src={seller.avatar_url}
                      alt={seller.name ?? "Seller"}
                    />
                  ) : (
                    <span>
                      {(seller.name ?? "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className={styles.sellerName}>
                  {seller.name || "Unnamed user"}
                </span>
              </Link>
            ) : (
              <p className={styles.meta}>Unknown seller</p>
            )}

            {seller && !isOwner && (
              <button
                type="button"
                className={styles.messageBtn}
                onClick={() => {
                  if (currentUserId) {
                    navigate(`/messages/${listing.id}/${seller.id}`);
                  } else {
                    navigate("/login");
                  }
                }}
              >
                💬 Message seller
              </button>
            )}

            {!isOwner && (
              <button
                type="button"
                className={styles.reportBtn}
                onClick={() => {
                  if (currentUserId) {
                    setReportOpen(true);
                  } else {
                    navigate("/login");
                  }
                }}
              >
                🚩 Report listing
              </button>
            )}
          </div>
        </div>
      </div>

      {isOwner && (
        <EditListingModal
          listingId={listing.id}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            load();
          }}
        />
      )}

      {canDelete && (
        <ConfirmModal
          open={confirmOpen}
          title="Delete listing"
          message="Delete this listing? This cannot be undone."
          confirmLabel="Delete"
          loadingLabel="Deleting…"
          loading={deleting}
          onConfirm={confirmDelete}
          onClose={() => setConfirmOpen(false)}
        />
      )}

      {!isOwner && (
        <ReportListingModal
          open={reportOpen}
          loading={reporting}
          onSubmit={handleReport}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}
