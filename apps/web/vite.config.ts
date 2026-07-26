import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@ankake/domain",
        replacement: fileURLToPath(new URL("../../packages/domain/src/index.ts", import.meta.url))
      },
      {
        find: "@ankake/cpu",
        replacement: fileURLToPath(new URL("../../packages/cpu/src/index.ts", import.meta.url))
      },
      {
        find: "@ankake/persistence",
        replacement: fileURLToPath(new URL("../../packages/persistence/src/index.ts", import.meta.url))
      },
      {
        find: "@ankake/ui/styles.css",
        replacement: fileURLToPath(new URL("../../packages/ui/src/styles.css", import.meta.url))
      },
      {
        find: "@ankake/ui",
        replacement: fileURLToPath(new URL("../../packages/ui/src/index.ts", import.meta.url))
      }
    ]
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    sourcemap: true
  }
});
