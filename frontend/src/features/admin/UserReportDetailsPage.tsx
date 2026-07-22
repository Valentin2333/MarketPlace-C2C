import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchUserReportDetail } from "../../lib/admin/adminApi";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { useUserReports } from "../../components/UserReports/useUserReports";
import styles from "./ReportDetailsPage.module.css";

type ReportRow = {
  id: string;
  reason: string;
  created_at: string | null;
  reporter_id: string;
  reporter_email: string;
  reporter_name: string | null;
};

type ReportedUserLite = {
  id: string;
  name: string | null;
};

const REASON_LABELS: Record<string, string> = {
  harassment: "Harassment or abusive behavior",
  scam: "Scam or fraud",
  fake_profile: "Fake profile or impersonation",
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

export default function UserReportDetailsPage() {
  const { userId: reportedUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { markUserSeen } = useUserReports();
  const { userId, isAdmin, ready: authReady } = useCurrentUser();

  const goBack = () => {
    if (location.key !== "default") navigate(-1);
    else navigate("/admin?tab=users");
  };

  const [reportedUser, setReportedUser] = useState<ReportedUserLite | null>(
    null,
  );
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
    if (!authReady || !isAdmin || !reportedUserId) return;
    let active = true;

    (async () => {
      const detail = await fetchUserReportDetail(reportedUserId).catch(
        () => null,
      );

      if (!active) return;

      setReportedUser(detail?.user ?? null);
      setReports((detail?.reports ?? []) as ReportRow[]);
      setLoading(false);

      markUserSeen(reportedUserId);
    })();

    return () => {
      active = false;
    };
  }, [authReady, isAdmin, reportedUserId, markUserSeen]);

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
        <button type="button" onClick={goBack} className={styles.back}>
          ← Back to admin
        </button>

        <h1 className={styles.heading}>Reported user</h1>

        {reportedUser ? (
          <Link
            to={`/profile/${reportedUser.id}`}
            className={styles.listingLink}
          >
            {reportedUser.name || "Unnamed user"}
            <span className={styles.listingArrow}>↗</span>
          </Link>
        ) : (
          <p className={styles.unavailable}>
            This user is no longer available.
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
          <div className={styles.state}>No reports for this user.</div>
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
