import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    // Server tests, plus the pure client libs (no DOM, no React) that carry
    // real logic worth pinning — smartSearch ranking in particular.
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "client/src/lib/**/*.test.ts"],
    setupFiles: ["dotenv/config"],
  },
});
