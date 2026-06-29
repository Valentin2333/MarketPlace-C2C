import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast/useToast";
import styles from "./MakeAdmin.module.css";

type UserLite = {
  id: string;
  email: string;
  role: string | null;
};

export default function MakeAdmin() {
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<UserLite[]>([]);
  const [selected, setSelected] = useState<UserLite | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = query.trim();
      if (q.length < 2 || (selected && selected.email === q)) {
        setSuggestions([]);
        setNoResults(false);
        return;
      }

      const { data } = await supabase.rpc("search_users_by_email", { q });
      const rows = (data ?? []) as UserLite[];
      setSuggestions(rows);
      setNoResults(rows.length === 0);
    }, 2000);

    return () => clearTimeout(timer);
  }, [query, selected]);

  const pickSuggestion = (user: UserLite) => {
    setSelected(user);
    setQuery(user.email);
    setSuggestions([]);
  };

  const handleSubmit = async () => {
    const q = query.trim();
    if (!q || submitting) return;

    setSubmitting(true);

    let target = selected;

    if (!target || target.email !== q) {
      const { data } = await supabase.rpc("search_users_by_email", { q });
      const rows = (data ?? []) as UserLite[];
      const exact = rows.filter(
        (r) => r.email.toLowerCase() === q.toLowerCase(),
      );

      if (exact.length === 0) {
        setSubmitting(false);
        toast.error(`No user found with email “${q}”.`);
        return;
      }
      target = exact[0];
    }

    if (target.role === "admin") {
      setSubmitting(false);
      toast.info(`${target.email} is already an admin.`);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", target.id);

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`${target.email} is now an admin.`);
    setQuery("");
    setSelected(null);
    setSuggestions([]);
  };

  return (
    <div className={styles.card}>
      <label className={styles.label} htmlFor="admin-email">
        Email
      </label>

      <div className={styles.searchWrap}>
        <input
          id="admin-email"
          className={styles.input}
          type="text"
          placeholder="Start typing an email…"
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setNoResults(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />

        {noResults && <div className={styles.hint}>No users found.</div>}

        {suggestions.length > 0 && (
          <ul className={styles.suggestions}>
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={styles.suggestion}
                  onClick={() => pickSuggestion(s)}
                >
                  <span className={styles.suggestionName}>{s.email}</span>
                  {s.role === "admin" && (
                    <span className={styles.adminTag}>admin</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        className={styles.submit}
        onClick={handleSubmit}
        disabled={submitting || !query.trim()}
      >
        {submitting ? "Making admin…" : "Make admin"}
      </button>
    </div>
  );
}
