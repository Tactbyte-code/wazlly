import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "server/__tests__/**/*.test.ts",
      "client/src/**/__tests__/**/*.test.ts",
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    pool: "forks",
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@diploy/core": path.resolve(__dirname, "packages/diploy-core/index.ts"),
      "server": path.resolve(__dirname, "server"),
    },
  },
});
