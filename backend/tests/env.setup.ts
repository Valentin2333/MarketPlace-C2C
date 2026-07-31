import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "..", ".env.test") });

// Never send real email during tests. Individual tests can inspect
// calls via `vi.mocked(sendEmail).mock.calls` to extract things like
// password reset links.
vi.mock("../src/email/gmail.js", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));
