import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast/useToast";
import styles from "./AdminPanel.module.css";

type UserLite = {
  id: string;
  email: string;
  role: string | null;
};

const PAGE_SIZE = 10;

export default function AdminPanel() {
  const navigate = useNavigate();
  const toast = useToast();

  const [ready, setReady] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

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

  const isSearching = search.trim().length >= 2;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        navigate("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.role !== "admin") {
        navigate("/listings");
        return;
      }
      setCurrentUid(user.id);
      setReady(true);
    });
  }, [navigate]);

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
    if (!ready) return;
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
  }, [ready, loadUsers]);

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
        <p className={styles.subheading}>Manage users.</p>

        <h2 className={styles.sectionHeading}>All users</h2>

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
              {searchLoading && <div className={styles.hint}>Searching…</div>}
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
      </div>
    </div>
  );
}
