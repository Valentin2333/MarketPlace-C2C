import { Router, type Request } from "express";
import {
  listConversations,
  getThreadMessages,
  sendMessage,
  markThreadRead,
  softDeleteChat,
  listUnread,
} from "../db/messages.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/requireAuth.js";

const router = Router();

function paramValue(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

router.get(
  "/conversations",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const conversations = await listConversations(req.user!.id);
    res.json({ conversations });
  },
);

router.get("/unread", requireAuth, async (req: AuthenticatedRequest, res) => {
  const unread = await listUnread(req.user!.id);
  res.json({ unread });
});

router.get(
  "/:listingId/:otherId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const listingId = paramValue(req, "listingId");
    const otherId = paramValue(req, "otherId");
    const messages = await getThreadMessages(listingId, req.user!.id, otherId);
    res.json({ messages });
  },
);

router.post(
  "/:listingId/:otherId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const { body } = req.body ?? {};
    if (typeof body !== "string" || !body.trim()) {
      res.status(400).json({ error: "Message body is required" });
      return;
    }

    const listingId = paramValue(req, "listingId");
    const otherId = paramValue(req, "otherId");

    if (otherId === req.user!.id) {
      res.status(400).json({ error: "You can't message yourself" });
      return;
    }

    const message = await sendMessage(
      listingId,
      req.user!.id,
      otherId,
      body.trim(),
    );
    res.status(201).json({ message });
  },
);

router.patch(
  "/:listingId/:otherId/read",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const listingId = paramValue(req, "listingId");
    const otherId = paramValue(req, "otherId");
    await markThreadRead(listingId, req.user!.id, otherId);
    res.status(204).send();
  },
);

router.delete(
  "/:listingId/:otherId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const listingId = paramValue(req, "listingId");
    const otherId = paramValue(req, "otherId");
    await softDeleteChat(listingId, req.user!.id, otherId);
    res.status(204).send();
  },
);

export default router;
