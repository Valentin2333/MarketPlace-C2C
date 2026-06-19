import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { formatDate } from "../../lib/format";
import styles from "./MessagesPage.module.css";

type MessageRow = {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string | null;
  read_at: string | null;
};

type ProfileLite = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

type ListingLite = {
  id: string;
  title: string;
  listing_images: { url: string }[] | null;
};

type Conversation = {
  key: string;
  listingId: string;
  otherId: string;
  lastBody: string;
  lastAt: string | null;
  lastFromMe: boolean;
  unread: number;
  listing: ListingLite | null;
  other: ProfileLite | null;
};

export default function MessagesPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (uid: string) => {
    const { data: rows } = await supabase
      .from("messages")
      .select(
        "id, listing_id, sender_id, receiver_id, body, created_at, read_at",
      )
      .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
      .order("created_at", { ascending: false });

    const messages = (rows ?? []) as MessageRow[];

    const grouped = new Map<string, Conversation>();
    for (const m of messages) {
      const otherId = m.sender_id === uid ? m.receiver_id : m.sender_id;
      const key = `${m.listing_id}::${otherId}`;
      let convo = grouped.get(key);
      if (!convo) {
        convo = {
          key,
          listingId: m.listing_id,
          otherId,
          lastBody: m.body,
          lastAt: m.created_at,
          lastFromMe: m.sender_id === uid,
          unread: 0,
          listing: null,
          other: null,
        };
        grouped.set(key, convo);
      }
      if (m.receiver_id === uid && m.read_at === null) {
        convo.unread += 1;
      }
    }

    const convos = Array.from(grouped.values());
    const otherIds = Array.from(new Set(convos.map((c) => c.otherId)));
    const listingIds = Array.from(new Set(convos.map((c) => c.listingId)));

    const [{ data: profiles }, { data: listings }] = await Promise.all([
      otherIds.length
        ? supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .in("id", otherIds)
        : Promise.resolve({ data: [] as ProfileLite[] }),
      listingIds.length
        ? supabase
            .from("listings")
            .select("id, title, listing_images ( url )")
            .in("id", listingIds)
        : Promise.resolve({ data: [] as ListingLite[] }),
    ]);

    const profileMap = new Map(
      ((profiles ?? []) as ProfileLite[]).map((p) => [p.id, p]),
    );
    const listingMap = new Map(
      ((listings ?? []) as ListingLite[]).map((l) => [l.id, l]),
    );

    setConversations(
      convos.map((c) => ({
        ...c,
        other: profileMap.get(c.otherId) ?? null,
        listing: listingMap.get(c.listingId) ?? null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) return;
      const uid = user?.id ?? null;
      setUserId(uid);
      if (uid) load(uid);
      else navigate("/login");
    });
    return () => {
      active = false;
    };
  }, [navigate, load]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => load(userId),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${userId}`,
        },
        () => load(userId),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.state}>Loading…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.heading}>Messages</h1>

        {conversations.length === 0 ? (
          <div className={styles.empty}>
            <p>You don’t have any conversations yet.</p>
            <Link to="/listings" className={styles.browse}>
              Browse listings
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {conversations.map((c) => {
              const thumb = c.listing?.listing_images?.[0]?.url ?? null;
              const name = c.other?.name || "Unknown user";
              const title = c.listing?.title || "Listing unavailable";
              return (
                <Link
                  key={c.key}
                  to={`/messages/${c.listingId}/${c.otherId}`}
                  className={`${styles.row} ${c.unread > 0 ? styles.rowUnread : ""}`}
                >
                  <div className={styles.thumb}>
                    {thumb ? (
                      <img src={thumb} alt={title} />
                    ) : (
                      <span className={styles.thumbFallback}>📦</span>
                    )}
                  </div>
                  <div className={styles.rowMain}>
                    <div className={styles.rowTop}>
                      <span className={styles.rowName}>{name}</span>
                      {c.lastAt && (
                        <span className={styles.rowDate}>
                          {formatDate(c.lastAt)}
                        </span>
                      )}
                    </div>
                    <span className={styles.rowTitle}>{title}</span>
                    <span className={styles.rowPreview}>
                      {c.lastFromMe ? "You: " : ""}
                      {c.lastBody}
                    </span>
                  </div>
                  {c.unread > 0 && (
                    <span className={styles.unreadDot}>{c.unread}</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
