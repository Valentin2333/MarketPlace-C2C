import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "..", ".env.test") });

vi.mock("../src/email/gmail.js", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));
