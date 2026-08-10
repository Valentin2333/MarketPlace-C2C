import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { useToast } from "../../components/Toast/useToast";
import { useReports } from "../../components/Reports/useReports";
import { useUserReports } from "../../components/UserReports/useUserReports";
import {
  fetchAdminUsers,
  searchAdminUsers,
  dismissListingReports,
  dismissUserReports,
  type AdminUser,
} from "../../lib/admin/adminApi";
import { updateUserRole } from "../../lib/users/usersApi";
import ConfirmModal from "../listings/ConfirmModal";
import Spinner from "../../components/Spinner/Spinner";
import styles from "./AdminPanel.module.css";

type UserLite = AdminUser;

type UserFilter = "all" | "reported" | "banned";

const PAGE_SIZE = 10;

type Tab = "users" | "reports";

export default function AdminPanel() {
  const navigate = useNavigate();
  const toast = useToast();

  const { userId: currentUid, isAdmin, ready: authReady } = useCurrentUser();
  const ready = authReady && isAdmin;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "users" ? "users" : "reports";
  const filterParam = searchParams.get("filter");
  const userFilter: UserFilter =
    filterParam === "reported" || filterParam === "banned"
      ? filterParam
      : "all";

  const setTab = (next: Tab) => {
    const params: Record<string, string> = {};
    if (next === "users") params.tab = "users";
    if (userFilter !== "all") params.filter = userFilter;
    setSearchParams(params);
  };

  const setUserFilter = (next: UserFilter) => {
    const params: Record<string, string> = { tab: "users" };
    if (next !== "all") params.filter = next;
    setSearchParams(params);
  };

  const [users, setUsers] = useState<UserLite[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserLite[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const { reports, unseenCount, ready: reportsReady, refresh } = useReports();
  const {
    reportedUsers,
    unseenCount: unseenUserReportsCount,
    refresh: refreshUserReports,
  } = useUserReports();

  const [confirmListingId, setConfirmListingId] = useState<string | null>(null);
  const [deletingReports, setDeletingReports] = useState(false);

  const [confirmReportedUserId, setConfirmReportedUserId] = useState<
    string | null
  >(null);
  const [deletingUserReports, setDeletingUserReports] = useState(false);

  const isSearching = search.trim().length >= 2;

  const handleDeleteReports = async () => {
    if (!confirmListingId) return;
    setDeletingReports(true);

    try {
      await dismissListingReports(confirmListingId);
    } catch (err) {
      setDeletingReports(false);
      setConfirmListingId(null);
      toast.error(err instanceof Error ? err.message : "Could not delete reports.");
      return;
    }

    setDeletingReports(false);
    setConfirmListingId(null);

    await refresh();
    toast.success("Reports deleted.");
  };

  const handleDeleteUserReports = async () => {
    if (!confirmReportedUserId) return;
    setDeletingUserReports(true);

    try {
      await dismissUserReports(confirmReportedUserId);
    } catch (err) {
      setDeletingUserReports(false);
      setConfirmReportedUserId(null);
      toast.error(err instanceof Error ? err.message : "Could not delete reports.");
      return;
    }

    setDeletingUserReports(false);
    setConfirmReportedUserId(null);

    await refreshUserReports();
    toast.success("Reports deleted.");
  };

  useEffect(() => {
    if (!authReady) return;
    if (!currentUid) {
      navigate("/login");
      return;
    }
    if (!isAdmin) {
      navigate("/listings");
    }
  }, [authReady, currentUid, isAdmin, navigate]);

  const loadUsers = useCallback(
    async (filter: UserFilter) => {
      if (loadingRef.current || !hasMoreRef.current) return;
      loadingRef.current = true;
      setLoadingUsers(true);

      if (filter === "reported") {
        hasMoreRef.current = false;
        setHasMore(false);
        setLoadingUsers(false);
        loadingRef.current = false;
        return;
      }

      try {
        const rows = await fetchAdminUsers(
          filter,
          PAGE_SIZE,
          offsetRef.current,
        );

        setUsers((prev) => [...prev, ...rows]);
        offsetRef.current += rows.length;
        hasMoreRef.current = rows.length === PAGE_SIZE;
        setHasMore(hasMoreRef.current);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not load users.",
        );
        hasMoreRef.current = false;
        setHasMore(false);
      } finally {
        setLoadingUsers(false);
        loadingRef.current = false;
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!ready || tab !== "users" || userFilter === "reported") return;
    let active = true;

    (async () => {
      setUsers([]);
      offsetRef.current = 0;
      hasMoreRef.current = true;
      setHasMore(true);
      if (active) await loadUsers(userFilter);
    })();

    const el = sentinelRef.current;
    if (!el) {
      return () => {
        active = false;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadUsers(userFilter);
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [ready, tab, userFilter, loadUsers]);

  useEffect(() => {
    if (userFilter === "reported") return;
    const timer = setTimeout(async () => {
      const q = search.trim();
      if (q.length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      try {
        const rows = await searchAdminUsers(q, userFilter);
        setSearchResults(rows);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not search users.",
        );
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, userFilter, toast]);

  const toggleBan = async (user: UserLite) => {
    const newRole: "user" | "banned" =
      user.role === "banned" ? "user" : "banned";

    try {
      await updateUserRole(user.id, newRole);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update user role.",
      );
      return;
    }

    const apply = (list: UserLite[]) =>
      list.map((u) => (u.id === user.id ? { ...u, role: newRole } : u));
    setUsers(apply);
    setSearchResults(apply);

    toast.success(
      newRole === "banned"
        ? `${user.email} has been banned.`
        : `${user.email} has been unbanned.`,
    );
  };

  const renderRow = (u: UserLite) => {
    const banned = u.role === "banned";
    const admin = u.role === "admin";
    const isSelf = u.id === currentUid;
    return (
      <div key={u.id} className={styles.userRow}>
        <Link to={`/profile/${u.id}`} className={styles.userEmail}>
          {u.email}
        </Link>
        {admin && <span className={styles.adminTag}>admin</span>}
        {banned && <span className={styles.bannedTag}>banned</span>}
        {u.reported && (
          <button
            type="button"
            className={styles.reportedTag}
            onClick={() => navigate(`/admin/user-reports/${u.id}`)}
          >
            reported
          </button>
        )}
        {!admin && !isSelf && (
          <button
            type="button"
            className={banned ? styles.unbanRowBtn : styles.banRowBtn}
            onClick={() => toggleBan(u)}
          >
            {banned ? "Unban" : "Ban"}
          </button>
        )}
      </div>
    );
  };

  const renderReportedUserRow = (r: (typeof reportedUsers)[number]) => (
    <div key={r.reportedId} className={styles.userRow}>
      {r.unseenCount > 0 && <span className={styles.unseenDot} />}
      <Link
        to={`/admin/user-reports/${r.reportedId}`}
        className={styles.userEmail}
      >
        {r.reportedEmail}
      </Link>
      <span className={styles.reportCount}>
        {r.count}
        {r.count === 1 ? " report" : " reports"}
      </span>
      <button
        type="button"
        className={styles.deleteReportBtn}
        onClick={() => setConfirmReportedUserId(r.reportedId)}
      >
        Delete report
      </button>
    </div>
  );

  if (!ready) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <Spinner size="lg" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Admin Panel</h1>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === "reports" ? styles.tabActive : ""}`}
            onClick={() => setTab("reports")}
          >
            Reported listings
            {unseenCount > 0 && (
              <span className={styles.tabBadge}>{unseenCount}</span>
            )}
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === "users" ? styles.tabActive : ""}`}
            onClick={() => setTab("users")}
          >
            Users
            {unseenUserReportsCount > 0 && (
              <span className={styles.tabBadge}>{unseenUserReportsCount}</span>
            )}
          </button>
        </div>

        {tab === "users" ? (
          <>
            <div className={styles.userFilters}>
              <button
                type="button"
                className={`${styles.filterPill} ${userFilter === "all" ? styles.filterPillActive : ""}`}
                onClick={() => setUserFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${userFilter === "reported" ? styles.filterPillActive : ""}`}
                onClick={() => setUserFilter("reported")}
              >
                Reported
                {unseenUserReportsCount > 0 && (
                  <span className={styles.filterBadge}>
                    {unseenUserReportsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${userFilter === "banned" ? styles.filterPillActive : ""}`}
                onClick={() => setUserFilter("banned")}
              >
                Banned
              </button>
            </div>

            {userFilter !== "reported" && (
              <div className={styles.userSearch}>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Search users by email…"
                  value={search}
                  autoComplete="off"
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSearchLoading(e.target.value.trim().length >= 2);
                  }}
                />
              </div>
            )}

            <div className={styles.userList}>
              {userFilter === "reported" ? (
                reportedUsers.length === 0 ? (
                  <div className={styles.hint}>No reported users.</div>
                ) : (
                  reportedUsers.map(renderReportedUserRow)
                )
              ) : isSearching ? (
                <>
                  {searchResults.map(renderRow)}
                  {searchLoading && (
                    <div className={`${styles.hint} ${styles.hintLoading}`}>
                      <Spinner size="sm" />
                      <span>Searching…</span>
                    </div>
                  )}
                  {!searchLoading && searchResults.length === 0 && (
                    <div className={styles.hint}>No users found.</div>
                  )}
                </>
              ) : (
                <>
                  {users.map(renderRow)}
                  {loadingUsers && (
                    <div className={`${styles.hint} ${styles.hintLoading}`}>
                      <Spinner size="sm" />
                      <span>Loading…</span>
                    </div>
                  )}
                  {!loadingUsers && !hasMore && users.length === 0 && (
                    <div className={styles.hint}>
                      {userFilter === "banned"
                        ? "No banned users."
                        : "No users."}
                    </div>
                  )}
                  {!hasMore && users.length > 0 && (
                    <div className={styles.hint}>No more users.</div>
                  )}
                  <div ref={sentinelRef} />
                </>
              )}
            </div>
          </>
        ) : (
          <div className={styles.reportList}>
            {!reportsReady ? (
              <div className={styles.hint}>Loading…</div>
            ) : reports.length === 0 ? (
              <div className={styles.hint}>No reported listings.</div>
            ) : (
              reports.map((r) => (
                <div key={r.listingId} className={styles.reportRow}>
                  <button
                    type="button"
                    className={styles.reportMain}
                    onClick={() => navigate(`/admin/reports/${r.listingId}`)}
                  >
                    {r.unseenCount > 0 && <span className={styles.unseenDot} />}
                    <span className={styles.reportTitle}>
                      {r.listingTitle || "Untitled listing"}
                    </span>
                  </button>
                  <div className={styles.reportMeta}>
                    <span className={styles.reportCount}>
                      {r.count}
                      {r.count === 1 ? " report" : " reports"}
                    </span>
                    <button
                      type="button"
                      className={styles.deleteReportBtn}
                      onClick={() => setConfirmListingId(r.listingId)}
                      aria-label="Delete report"
                    >
                      Delete report
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmListingId !== null}
        title="Delete reports"
        message="Delete all reports for this listing? The users who reported it won't be able to report it again."
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        loading={deletingReports}
        onConfirm={handleDeleteReports}
        onClose={() => setConfirmListingId(null)}
      />

      <ConfirmModal
        open={confirmReportedUserId !== null}
        title="Delete reports"
        message="Delete all reports for this user? The users who reported them won't be able to report them again."
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        loading={deletingUserReports}
        onConfirm={handleDeleteUserReports}
        onClose={() => setConfirmReportedUserId(null)}
      />
    </div>
  );
}
