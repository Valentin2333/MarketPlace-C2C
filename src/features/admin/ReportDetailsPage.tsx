import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { useReports } from "../../components/Reports/useReports";
import styles from "./ReportDetailsPage.module.css";

type ReportRow = {
  id: string;
  reason: string;
  created_at: string | null;
  reporter_id: string;
  reporter_email: string;
  reporter_name: string | null;
};

type ListingLite = {
  id: string;
  title: string | null;
};

const REASON_LABELS: Record<string, string> = {
  illegal: "Prohibited or illegal item",
  scam: "Scam or fraud",
  inappropriate: "Inappropriate or offensive",
  other: "Other",
};

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function ReportDetailsPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { markListingSeen } = useReports();
  const { userId, isAdmin, ready: authReady } = useCurrentUser();

  const [listing, setListing] = useState<ListingLite | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady) return;
    if (!userId) {
      navigate("/login");
      return;
    }
    if (!isAdmin) {
      navigate("/listings");
    }
  }, [authReady, userId, isAdmin, navigate]);

  useEffect(() => {
    if (!authReady || !isAdmin || !listingId) return;
    let active = true;

    (async () => {
      const [{ data: list }, { data: reps }] = await Promise.all([
        supabase
          .from("listings")
          .select("id, title")
          .eq("id", listingId)
          .maybeSingle(),
        supabase.rpc("admin_list_listing_reports", {
          p_listing_id: listingId,
        }),
      ]);

      if (!active) return;
      setListing((list ?? null) as ListingLite | null);
      setReports((reps ?? []) as ReportRow[]);
      setLoading(false);

      markListingSeen(listingId);
    })();

    return () => {
      active = false;
    };
  }, [authReady, isAdmin, listingId, markListingSeen]);

  if (!authReady || !isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>Loading…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/admin?tab=reports" className={styles.back}>
          ← Back to admin
        </Link>

        <h1 className={styles.heading}>Reported listing</h1>

        {listing ? (
          <Link to={`/listings/${listing.id}`} className={styles.listingLink}>
            {listing.title || "Untitled listing"}
            <span className={styles.listingArrow}>↗</span>
          </Link>
        ) : (
          <p className={styles.unavailable}>
            This listing is no longer available.
          </p>
        )}

        <h2 className={styles.sectionHeading}>
          Reports
          {reports.length > 0 && (
            <span className={styles.countTag}>{reports.length}</span>
          )}
        </h2>

        {loading ? (
          <div className={styles.state}>Loading…</div>
        ) : reports.length === 0 ? (
          <div className={styles.state}>No reports for this listing.</div>
        ) : (
          <div className={styles.reportList}>
            {reports.map((r) => (
              <div key={r.id} className={styles.reportItem}>
                <div className={styles.reportTop}>
                  <span className={styles.reason}>
                    {REASON_LABELS[r.reason] ?? r.reason}
                  </span>
                  {r.created_at && (
                    <span className={styles.date}>
                      {formatDate(r.created_at)}
                    </span>
                  )}
                </div>
                <Link
                  to={`/profile/${r.reporter_id}`}
                  className={styles.reporter}
                >
                  {r.reporter_name
                    ? `${r.reporter_name} · ${r.reporter_email}`
                    : r.reporter_email}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
