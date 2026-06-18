import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/Toast/useToast";
import { useUnread } from "../../components/Messages/useUnread";
import styles from "./ChatThreadPage.module.css";

type Message = {
  id: string;
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

const MESSAGE_COLUMNS = "id, sender_id, receiver_id, body, created_at, read_at";

function formatTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function ChatThreadPage() {
  const { listingId, otherId } = useParams<{
    listingId: string;
    otherId: string;
  }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { markConversationRead } = useUnread();

  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<ProfileLite | null>(null);
  const [listing, setListing] = useState<ListingLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);

  const markThreadRead = useCallback(async () => {
    if (!userId || !listingId || !otherId) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("listing_id", listingId)
      .eq("sender_id", otherId)
      .eq("receiver_id", userId)
      .is("read_at", null);
    markConversationRead(listingId, otherId);
  }, [userId, listingId, otherId, markConversationRead]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!userId) {
      navigate("/login");
      return;
    }
    if (!listingId || !otherId) return;
    if (otherId === userId) {
      navigate("/messages");
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);

      const [{ data: msgs }, { data: profile }, { data: list }] =
        await Promise.all([
          supabase
            .from("messages")
            .select(MESSAGE_COLUMNS)
            .eq("listing_id", listingId)
            .or(
              `and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`,
            )
            .order("created_at", { ascending: true }),
          supabase
            .from("profiles")
            .select("id, name, avatar_url")
            .eq("id", otherId)
            .maybeSingle(),
          supabase
            .from("listings")
            .select("id, title, listing_images ( url )")
            .eq("id", listingId)
            .maybeSingle(),
        ]);

      if (!active) return;

      const loaded = (msgs ?? []) as Message[];
      setMessages(loaded);
      setOther((profile ?? null) as ProfileLite | null);
      setListing((list ?? null) as ListingLite | null);
      setLoading(false);

      if (loaded.some((m) => m.receiver_id === userId && m.read_at === null)) {
        markThreadRead();
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [authReady, userId, listingId, otherId, navigate, markThreadRead]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const handleSend = async () => {
    const text = body.trim();
    if (!text || !userId || !listingId || !otherId || sending) return;

    setSending(true);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        listing_id: listingId,
        sender_id: userId,
        receiver_id: otherId,
        body: text,
      })
      .select(MESSAGE_COLUMNS)
      .single();

    setSending(false);

    if (error || !data) {
      toast.error(error?.message ?? "Could not send message.");
      return;
    }

    const sent = data as Message;
    setMessages((prev) =>
      prev.some((x) => x.id === sent.id) ? prev : [...prev, sent],
    );
    setBody("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const thumb = listing?.listing_images?.[0]?.url ?? null;
  const otherName = other?.name || "Unknown user";

  let lastMineId: string | null = null;
  for (const m of messages) {
    if (m.sender_id === userId) lastMineId = m.id;
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/messages" className={styles.back}>
          ← All messages
        </Link>

        <div className={styles.thread}>
          <div className={styles.header}>
            <Link to={`/profile/${otherId}`} className={styles.headerUser}>
              <div className={styles.avatar}>
                {other?.avatar_url ? (
                  <img src={other.avatar_url} alt={otherName} />
                ) : (
                  <span>{otherName.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <span className={styles.headerName}>{otherName}</span>
            </Link>

            {listing && (
              <Link
                to={`/listings/${listing.id}`}
                className={styles.headerListing}
              >
                <div className={styles.headerThumb}>
                  {thumb ? (
                    <img src={thumb} alt={listing.title} />
                  ) : (
                    <span>📦</span>
                  )}
                </div>
                <span className={styles.headerTitle}>{listing.title}</span>
              </Link>
            )}
          </div>

          <div className={styles.messages} ref={messagesRef}>
            {loading ? (
              <div className={styles.state}>Loading…</div>
            ) : messages.length === 0 ? (
              <div className={styles.state}>No messages yet. Say hello 👋</div>
            ) : (
              messages.map((m) => {
                const mine = m.sender_id === userId;
                return (
                  <div
                    key={m.id}
                    className={`${styles.bubbleRow} ${mine ? styles.mine : styles.theirs}`}
                  >
                    <div className={styles.bubble}>
                      <span className={styles.bubbleBody}>{m.body}</span>
                      <span className={styles.bubbleTime}>
                        {formatTime(m.created_at)}
                      </span>
                    </div>
                    {mine && m.id === lastMineId && (
                      <span className={styles.status}>
                        {m.read_at ? "Seen" : "Sent"}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.composer}>
            <textarea
              className={styles.input}
              placeholder="Message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
            />
            <button
              type="button"
              className={styles.send}
              onClick={handleSend}
              disabled={sending || !body.trim()}
              aria-label="Send"
            >
              <svg
                viewBox="0 0 24 24"
                className={styles.sendIcon}
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
