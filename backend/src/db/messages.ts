import { pool } from "./pool.js";

export interface ConversationRow {
  listingId: string;
  otherId: string;
  lastBody: string;
  lastAt: string;
  lastFromMe: boolean;
  unread: number;
  listing: { id: string; title: string; imageUrl: string | null } | null;
  other: { id: string; name: string | null; avatarUrl: string | null } | null;
}

export async function listConversations(
  userId: string,
): Promise<ConversationRow[]> {
  const result = await pool.query<ConversationRow>(
    `WITH pair_messages AS (
       SELECT m.*,
         CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END AS other_id
       FROM messages m
       WHERE m.sender_id = $1 OR m.receiver_id = $1
     ),
     visible AS (
       SELECT pm.*
       FROM pair_messages pm
       LEFT JOIN chat_deletes cd
         ON cd.listing_id = pm.listing_id AND cd.user_id = $1 AND cd.other_id = pm.other_id
       WHERE cd.deleted_at IS NULL OR pm.created_at > cd.deleted_at
     ),
     latest AS (
       SELECT DISTINCT ON (listing_id, other_id) *
       FROM visible
       ORDER BY listing_id, other_id, created_at DESC
     ),
     unread_counts AS (
       SELECT listing_id, other_id, COUNT(*)::int AS unread
       FROM visible
       WHERE receiver_id = $1 AND read_at IS NULL
       GROUP BY listing_id, other_id
     )
     SELECT l.listing_id AS "listingId", l.other_id AS "otherId",
            l.body AS "lastBody", l.created_at AS "lastAt",
            (l.sender_id = $1) AS "lastFromMe",
            COALESCE(uc.unread, 0) AS unread,
            CASE WHEN lst.id IS NOT NULL THEN json_build_object(
              'id', lst.id, 'title', lst.title,
              'imageUrl', (
                SELECT url FROM listing_images
                WHERE listing_id = lst.id
                ORDER BY position ASC LIMIT 1
              )
            ) END AS listing,
            CASE WHEN usr.id IS NOT NULL THEN json_build_object(
              'id', usr.id, 'name', usr.name, 'avatarUrl', usr.avatar_url
            ) END AS other
     FROM latest l
     LEFT JOIN listings lst ON lst.id = l.listing_id
     LEFT JOIN users usr ON usr.id = l.other_id
     LEFT JOIN unread_counts uc
       ON uc.listing_id = l.listing_id AND uc.other_id = l.other_id
     ORDER BY l.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

export async function getThreadMessages(
  listingId: string,
  userId: string,
  otherId: string,
): Promise<MessageRow[]> {
  const result = await pool.query<MessageRow>(
    `SELECT m.id, m.sender_id, m.receiver_id, m.body, m.created_at, m.read_at
     FROM messages m
     LEFT JOIN chat_deletes cd
       ON cd.listing_id = m.listing_id AND cd.user_id = $2 AND cd.other_id = $3
     WHERE m.listing_id = $1
       AND ((m.sender_id = $2 AND m.receiver_id = $3) OR (m.sender_id = $3 AND m.receiver_id = $2))
       AND (cd.deleted_at IS NULL OR m.created_at > cd.deleted_at)
     ORDER BY m.created_at ASC`,
    [listingId, userId, otherId],
  );
  return result.rows;
}

export async function sendMessage(
  listingId: string,
  senderId: string,
  receiverId: string,
  body: string,
): Promise<MessageRow> {
  const result = await pool.query<MessageRow>(
    `INSERT INTO messages (listing_id, sender_id, receiver_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id, sender_id, receiver_id, body, created_at, read_at`,
    [listingId, senderId, receiverId, body],
  );
  return result.rows[0];
}

export async function markThreadRead(
  listingId: string,
  receiverId: string,
  senderId: string,
): Promise<void> {
  await pool.query(
    `UPDATE messages SET read_at = now()
     WHERE listing_id = $1 AND sender_id = $2 AND receiver_id = $3 AND read_at IS NULL`,
    [listingId, senderId, receiverId],
  );
}

export async function softDeleteChat(
  listingId: string,
  userId: string,
  otherId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO chat_deletes (listing_id, user_id, other_id, deleted_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (listing_id, user_id, other_id)
     DO UPDATE SET deleted_at = now()`,
    [listingId, userId, otherId],
  );
}

export interface UnreadRow {
  listing_id: string;
  sender_id: string;
}

export async function listUnread(userId: string): Promise<UnreadRow[]> {
  const result = await pool.query<UnreadRow>(
    `SELECT listing_id, sender_id FROM messages WHERE receiver_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return result.rows;
}
