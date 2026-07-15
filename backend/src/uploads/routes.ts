import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "../storage/r2.js";
import {
  getTotalStorageBytes,
  recordUploadedFile,
  removeUploadedFiles,
} from "../db/uploadedFiles.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/requireAuth.js";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const STORAGE_LIMIT_BYTES =
  (Number(process.env.R2_STORAGE_LIMIT_GB) || 9.5) * 1024 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

const router = Router();

function extFromFilename(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "jpg";
}

router.post(
  "/",
  requireAuth,
  upload.single("file"),
  async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const currentUsage = await getTotalStorageBytes();
    if (currentUsage + req.file.size > STORAGE_LIMIT_BYTES) {
      res.status(507).json({
        error: "Storage limit reached. Please contact the site owner.",
      });
      return;
    }

    const ext = extFromFilename(req.file.originalname);
    const key = `${req.user!.id}/${randomUUID()}.${ext}`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }),
    );

    await recordUploadedFile(key, req.user!.id, req.file.size);

    res.status(201).json({ url: `${R2_PUBLIC_URL}/${key}` });
  },
);

router.delete("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { urls } = req.body ?? {};

  if (!Array.isArray(urls) || urls.some((u) => typeof u !== "string")) {
    res.status(400).json({ error: "urls must be an array of strings" });
    return;
  }

  const prefix = `${req.user!.id}/`;
  const keys = (urls as string[])
    .filter((url) => url.startsWith(`${R2_PUBLIC_URL}/`))
    .map((url) => url.slice(R2_PUBLIC_URL.length + 1))
    .filter((key) => key.startsWith(prefix));

  if (keys.length === 0) {
    res.status(204).send();
    return;
  }

  await r2Client.send(
    new DeleteObjectsCommand({
      Bucket: R2_BUCKET_NAME,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );

  await removeUploadedFiles(keys);

  res.status(204).send();
});

export default router;
