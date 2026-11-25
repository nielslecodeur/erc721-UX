import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@reown/appkit/core": fileURLToPath(
        new URL("./src/lib/no-wallet-modal.ts", import.meta.url),
      ),
    },
  },
});
