import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { useToast } from "../../components/Toast/useToast";
import { useReports } from "../../components/Reports/useReports";
import ConfirmModal from "../listings/ConfirmModal";
import styles from "./AdminPanel.module.css";

type UserLite = {
  id: string;
  email: string;
  role: string | null;
};

const PAGE_SIZE = 10;

type Tab = "users" | "reports";

export default function AdminPanel() {
  const navigate = useNavigate();
  const toast = useToast();

  const { userId: currentUid, isAdmin, ready: authReady } = useCurrentUser();
  const ready = authReady && isAdmin;
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = searchParams.get("tab") === "users" ? "users" : "reports";
  const setTab = (next: Tab) => {
    setSearchParams(next === "users" ? { tab: "users" } : {});
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

  const [confirmListingId, setConfirmListingId] = useState<string | null>(null);
  const [deletingReports, setDeletingReports] = useState(false);

  const isSearching = search.trim().length >= 2;

  const handleDeleteReports = async () => {
    if (!confirmListingId) return;
    setDeletingReports(true);

    const { error } = await supabase
      .from("reports")
      .update({ dismissed: true })
      .eq("listing_id", confirmListingId)
      .eq("dismissed", false);

    setDeletingReports(false);
    setConfirmListingId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    await refresh();
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

  const loadUsers = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoadingUsers(true);

    const { data } = await supabase.rpc("admin_list_users", {
      p_limit: PAGE_SIZE,
      p_offset: offsetRef.current,
    });
    const rows = (data ?? []) as UserLite[];

    setUsers((prev) => [...prev, ...rows]);
    offsetRef.current += rows.length;
    hasMoreRef.current = rows.length === PAGE_SIZE;
    setHasMore(hasMoreRef.current);

    setLoadingUsers(false);
    loadingRef.current = false;
  }, []);

  useEffect(() => {
    if (!ready || tab !== "users") return;
    loadUsers();

    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadUsers();
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready, tab, loadUsers]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = search.trim();
      if (q.length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      const { data } = await supabase.rpc("search_users_by_email", { q });
      setSearchResults((data ?? []) as UserLite[]);
      setSearchLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const toggleBan = async (user: UserLite) => {
    const newRole = user.role === "banned" ? null : "banned";
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
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

  if (!ready) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>Loading…</div>
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
          </button>
        </div>

        {tab === "users" ? (
          <>
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

            <div className={styles.userList}>
              {isSearching ? (
                <>
                  {searchResults.map(renderRow)}
                  {searchLoading && (
                    <div className={styles.hint}>Searching…</div>
                  )}
                  {!searchLoading && searchResults.length === 0 && (
                    <div className={styles.hint}>No users found.</div>
                  )}
                </>
              ) : (
                <>
                  {users.map(renderRow)}
                  {loadingUsers && <div className={styles.hint}>Loading…</div>}
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
    </div>
  );
}
