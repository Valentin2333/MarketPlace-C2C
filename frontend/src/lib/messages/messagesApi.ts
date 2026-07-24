import { apiJson, apiFetch } from "../api/client";

export type Conversation = {
  key: string;
  listingId: string;
  otherId: string;
  lastBody: string;
  lastAt: string | null;
  lastFromMe: boolean;
  unread: number;
  listing: {
    id: string;
    title: string;
    listing_images: { url: string }[] | null;
  } | null;
  other: { id: string; name: string | null; avatar_url: string | null } | null;
};

type ConversationApiRow = {
  listingId: string;
  otherId: string;
  lastBody: string;
  lastAt: string;
  lastFromMe: boolean;
  unread: number;
  listing: { id: string; title: string; imageUrl: string | null } | null;
  other: { id: string; name: string | null; avatarUrl: string | null } | null;
};

export async function fetchConversations(): Promise<Conversation[]> {
  const response = await apiJson<{ conversations: ConversationApiRow[] }>(
    "/messages/conversations",
  );

  return response.conversations.map((c) => ({
    key: `${c.listingId}::${c.otherId}`,
    listingId: c.listingId,
    otherId: c.otherId,
    lastBody: c.lastBody,
    lastAt: c.lastAt,
    lastFromMe: c.lastFromMe,
    unread: c.unread,
    listing: c.listing
      ? {
          id: c.listing.id,
          title: c.listing.title,
          listing_images: c.listing.imageUrl
            ? [{ url: c.listing.imageUrl }]
            : [],
        }
      : null,
    other: c.other
      ? { id: c.other.id, name: c.other.name, avatar_url: c.other.avatarUrl }
      : null,
  }));
}

export type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string | null;
  read_at: string | null;
};

export async function fetchThread(
  listingId: string,
  otherId: string,
): Promise<Message[]> {
  const response = await apiJson<{ messages: Message[] }>(
    `/messages/${listingId}/${otherId}`,
  );
  return response.messages;
}

export async function sendMessageRequest(
  listingId: string,
  otherId: string,
  body: string,
): Promise<Message> {
  const response = await apiJson<{ message: Message }>(
    `/messages/${listingId}/${otherId}`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
  return response.message;
}

export async function markThreadReadRequest(
  listingId: string,
  otherId: string,
): Promise<void> {
  await apiFetch(`/messages/${listingId}/${otherId}/read`, {
    method: "PATCH",
  });
}

export async function deleteChatRequest(
  listingId: string,
  otherId: string,
): Promise<void> {
  await apiFetch(`/messages/${listingId}/${otherId}`, { method: "DELETE" });
}

export type UnreadRow = { listing_id: string; sender_id: string };

export async function fetchUnread(): Promise<UnreadRow[]> {
  const response = await apiJson<{ unread: UnreadRow[] }>("/messages/unread");
  return response.unread;
}
