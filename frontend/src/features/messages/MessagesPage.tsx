import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchConversations, deleteChatRequest } from "../../lib/messages/messagesApi";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { formatDate } from "../../lib/format";
import { useToast } from "../../components/Toast/useToast";
import { useUnread } from "../../components/Messages/useUnread";
import ConfirmModal from "../listings/ConfirmModal";
import styles from "./MessagesPage.module.css";

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
  const toast = useToast();
  const { markConversationRead } = useUnread();
  const { userId, ready: authReady } = useCurrentUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const convos = await fetchConversations();
    setConversations(convos);
    setLoading(false);
  }, []);

  const handleDeleteChat = async () => {
    if (!deleteTarget || !userId) return;
    setDeleting(true);

    try {
      await deleteChatRequest(deleteTarget.listingId, deleteTarget.otherId);
    } catch (err) {
      setDeleting(false);
      setDeleteTarget(null);
      toast.error(err instanceof Error ? err.message : "Could not delete chat.");
      return;
    }

    setDeleting(false);
    setDeleteTarget(null);

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
      if (active) await load();
    })();
    return () => {
      active = false;
    };
  }, [authReady, userId, navigate, load]);

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
