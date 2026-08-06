import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Loaded before ../src/migrate.js runs its own `import "dotenv/config"`.
// dotenv never overwrites a variable that's already set, so pointing
// DATABASE_URL at the test branch here makes migrate.ts apply pending
// migrations there instead of to the dev database in .env.
config({ path: path.resolve(__dirname, "..", ".env.test") });

await import("../src/migrate.js");
