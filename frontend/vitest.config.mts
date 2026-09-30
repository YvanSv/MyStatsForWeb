import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["app/**/*.test.{ts,tsx}"],
    css: false,
    // Les tests de types (*.test-d.ts) sont vérifiés par tsc pendant `vitest run`
    typecheck: { enabled: true, include: ["app/**/*.test-d.ts"], tsconfig: "./tsconfig.json" },
  },
});
