import {
  createPublicClient,
  fallback,
  getAddress,
  http,
  isAddress,
} from "viem";
import { mainnet, sepolia } from "viem/chains";

function rpcUrl(value: string | undefined, defaultUrl: string) {
  if (!value?.trim()) return defaultUrl;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname))
    )
      return url.href;
  } catch {
    /* The configuration page explains the invalid value. */
  }
  return defaultUrl;
}

export const configuredRpc = import.meta.env.VITE_SEPOLIA_RPC_URL?.trim() || "";
export const sepoliaRpc = rpcUrl(
  configuredRpc,
  "https://ethereum-sepolia-rpc.publicnode.com",
);
export const mainnetRpc = rpcUrl(
  import.meta.env.VITE_MAINNET_RPC_URL,
  "https://ethereum-rpc.publicnode.com",
);
export const walletConnectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() || "";
export const preferredAddress = getAddress(
  isAddress(import.meta.env.VITE_STUDENT_ADDRESS || "")
    ? import.meta.env.VITE_STUDENT_ADDRESS
    : "0x4e7f5303BdE72312BF53E7Bc0B51dC216ACB1621",
);

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: fallback([
    http(sepoliaRpc, { timeout: 12_000, retryCount: 1 }),
    http("https://rpc.sepolia.org", { timeout: 12_000, retryCount: 1 }),
  ]),
});
export const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(mainnetRpc, { timeout: 8_000, retryCount: 0 }),
});
export { sepolia };
export const explorer = "https://sepolia.etherscan.io";
export const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;
