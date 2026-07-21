import { Router, type Request } from "express";
import { listUsers, searchUsers } from "../db/adminUsers.js";
import {
  listGroupedListingReports,
  getListingReportDetail,
  markListingReportsSeen,
  dismissListingReports,
} from "../db/reports.js";
import {
  listGroupedUserReports,
  getUserReportDetail,
  markUserReportsSeen,
  dismissUserReports,
} from "../db/userReports.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

router.use(requireAuth, requireAdmin);

function paramValue(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}

function parseFilter(value: unknown): "all" | "banned" {
  return value === "banned" ? "banned" : "all";
}

router.get("/users", async (req, res) => {
  const limit = Number(req.query.limit) || 10;
  const offset = Number(req.query.offset) || 0;
  const filter = parseFilter(req.query.filter);
  const users = await listUsers(filter, limit, offset);
  res.json({ users });
});

router.get("/users/search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const filter = parseFilter(req.query.filter);
  if (q.length < 2) {
    res.json({ users: [] });
    return;
  }
  const users = await searchUsers(q, filter);
  res.json({ users });
});

router.get("/reports", async (_req, res) => {
  const reports = await listGroupedListingReports();
  res.json({ reports });
});

router.get("/reports/:listingId", async (req, res) => {
  const detail = await getListingReportDetail(paramValue(req, "listingId"));
  res.json(detail);
});

router.patch("/reports/:listingId/seen", async (req, res) => {
  await markListingReportsSeen(paramValue(req, "listingId"));
  res.status(204).send();
});

router.delete("/reports/:listingId", async (req, res) => {
  await dismissListingReports(paramValue(req, "listingId"));
  res.status(204).send();
});

router.get("/user-reports", async (_req, res) => {
  const reports = await listGroupedUserReports();
  res.json({ reports });
});

router.get("/user-reports/:reportedId", async (req, res) => {
  const detail = await getUserReportDetail(paramValue(req, "reportedId"));
  res.json(detail);
});

router.patch("/user-reports/:reportedId/seen", async (req, res) => {
  await markUserReportsSeen(paramValue(req, "reportedId"));
  res.status(204).send();
});

router.delete("/user-reports/:reportedId", async (req, res) => {
  await dismissUserReports(paramValue(req, "reportedId"));
  res.status(204).send();
});

export default router;
