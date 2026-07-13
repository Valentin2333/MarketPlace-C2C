import { Pool, types } from "pg";
import "dotenv/config";

types.setTypeParser(1700, (value: string) => parseFloat(value));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
});
