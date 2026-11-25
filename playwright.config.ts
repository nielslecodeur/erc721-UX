import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5174",
    channel:
      process.env.PLAYWRIGHT_CHANNEL ||
      (process.platform === "win32" ? "msedge" : undefined),
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    // Fixtures stables : les cles locales ne doivent pas changer les tests.
    env: {
      VITE_SEPOLIA_RPC_URL: "https://ethereum-sepolia-rpc.publicnode.com",
      VITE_MAINNET_RPC_URL: "https://ethereum-rpc.publicnode.com",
      VITE_WALLETCONNECT_PROJECT_ID: "",
      VITE_STUDENT_ADDRESS: "0x4e7f5303BdE72312BF53E7Bc0B51dC216ACB1621",
    },
  },
});
