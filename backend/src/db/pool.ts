import { Pool, types } from "pg";
import "dotenv/config";

types.setTypeParser(1700, (value: string) => parseFloat(value));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Neon (and any managed Postgres) requires SSL, so it stays on by default.
// A local Postgres — e.g. the service container in CI — doesn't support it;
// opt out with `?sslmode=disable` in the connection string.
const sslDisabled = /[?&]sslmode=disable\b/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: sslDisabled ? false : { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
});
