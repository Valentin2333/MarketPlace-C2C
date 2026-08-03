import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/env.setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Tests share one real Postgres database and reset it between cases.
    // Running files in parallel would race against those resets.
    fileParallelism: false,
  },
});
