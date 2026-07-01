import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { formatDate } from "../../lib/format";
import { useToast } from "../../components/Toast/useToast";
import { useUnread } from "../../components/Messages/useUnread";
import ConfirmModal from "../listings/ConfirmModal";
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

type ChatDeleteRow = {
  listing_id: string;
  other_id: string;
  deleted_at: string;
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
  const toast = useToast();
  const { markConversationRead } = useUnread();
  const { userId, ready: authReady } = useCurrentUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async (uid: string) => {
    const [{ data: rows }, { data: deletes }] = await Promise.all([
      supabase
        .from("messages")
        .select(
          "id, listing_id, sender_id, receiver_id, body, created_at, read_at",
        )
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order("created_at", { ascending: false }),
      supabase
        .from("chat_deletes")
        .select("listing_id, other_id, deleted_at")
        .eq("user_id", uid),
    ]);

    const deletedMap = new Map(
      ((deletes ?? []) as ChatDeleteRow[]).map((d) => [
        `${d.listing_id}::${d.other_id}`,
        d.deleted_at,
      ]),
    );

    const messages = ((rows ?? []) as MessageRow[]).filter((m) => {
      const otherId = m.sender_id === uid ? m.receiver_id : m.sender_id;
      const deletedAt = deletedMap.get(`${m.listing_id}::${otherId}`);
      return !deletedAt || (m.created_at !== null && m.created_at > deletedAt);
    });

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

  const handleDeleteChat = async () => {
    if (!deleteTarget || !userId) return;
    setDeleting(true);

    const { error } = await supabase.rpc("delete_chat", {
      p_listing_id: deleteTarget.listingId,
      p_other_id: deleteTarget.otherId,
    });

    setDeleting(false);
    setDeleteTarget(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setConversations((prev) => prev.filter((c) => c.key !== deleteTarget.key));
    markConversationRead(deleteTarget.listingId, deleteTarget.otherId);
    toast.success("Chat deleted.");
  };

  useEffect(() => {
    if (!authReady) return;
    if (!userId) {
      navigate("/login");
      return;
    }
    let active = true;
    (async () => {
      if (active) await load(userId);
    })();
    return () => {
      active = false;
    };
  }, [authReady, userId, navigate, load]);

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
                  <button
                    type="button"
                    className={styles.deleteRowBtn}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTarget(c);
                    }}
                    aria-label="Delete chat"
                    title="Delete chat"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={styles.deleteRowIcon}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13" />
                    </svg>
                  </button>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete chat"
        message={`Delete your chat with ${deleteTarget?.other?.name || "this user"}? It will stay in their inbox unless they delete it too.`}
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        loading={deleting}
        onConfirm={handleDeleteChat}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
