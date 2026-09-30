import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@delivery/types": path.resolve(__dirname, "packages/types/src/index.ts"),
      "@delivery/config": path.resolve(__dirname, "packages/config/src/index.ts"),
      "@delivery/constants": path.resolve(__dirname, "packages/constants/src/index.ts"),
      "@delivery/validation": path.resolve(__dirname, "packages/validation/src/index.ts"),
      "@delivery/utils": path.resolve(__dirname, "packages/utils/src/index.ts"),
      "@delivery/auth": path.resolve(__dirname, "packages/auth/src/index.ts"),
      "@delivery/database": path.resolve(__dirname, "packages/database/src/index.ts"),
      "@delivery/ui": path.resolve(__dirname, "packages/ui/src/index.ts"),
      "@delivery/api-client": path.resolve(__dirname, "packages/api-client/src/index.ts"),
      "@delivery/api-contracts": path.resolve(__dirname, "packages/api-contracts/src/index.ts"),
    },
  },
});
