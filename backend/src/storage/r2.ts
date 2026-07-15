import { S3Client } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID: string = (() => {
  const value = process.env.R2_ACCOUNT_ID;
  if (!value) {
    throw new Error("R2_ACCOUNT_ID is not set");
  }
  return value;
})();

const R2_ACCESS_KEY_ID: string = (() => {
  const value = process.env.R2_ACCESS_KEY_ID;
  if (!value) {
    throw new Error("R2_ACCESS_KEY_ID is not set");
  }
  return value;
})();

const R2_SECRET_ACCESS_KEY: string = (() => {
  const value = process.env.R2_SECRET_ACCESS_KEY;
  if (!value) {
    throw new Error("R2_SECRET_ACCESS_KEY is not set");
  }
  return value;
})();

export const R2_BUCKET_NAME: string = (() => {
  const value = process.env.R2_BUCKET_NAME;
  if (!value) {
    throw new Error("R2_BUCKET_NAME is not set");
  }
  return value;
})();

export const R2_PUBLIC_URL: string = (() => {
  const value = process.env.R2_PUBLIC_URL;
  if (!value) {
    throw new Error("R2_PUBLIC_URL is not set");
  }
  return value.replace(/\/$/, "");
})();

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
