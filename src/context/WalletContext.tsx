import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { getAddress, isAddress } from "viem";
import type { Address, EIP1193Provider } from "viem";
import { ensClient, sepolia, sepoliaRpc, walletConnectId } from "../lib/config";
import { explainError } from "../lib/errors";

type Listener = (...args: unknown[]) => void;
export type Provider = EIP1193Provider & {
  on: (event: string, listener: Listener) => void;
  removeListener: (event: string, listener: Listener) => void;
  disconnect?: () => Promise<void>;
};
declare global {
  interface Window {
    ethereum?: Provider;
  }
}

interface WalletState {
  provider?: Provider;
  address?: Address;
  chainId?: number;
  ensName?: string;
  busy: boolean;
  error?: string;
  pairingUri?: string;
  connect: (method: "injected" | "walletconnect") => Promise<void>;
  disconnect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  cancelPairing: () => void;
}
const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<Provider>();
  const [address, setAddress] = useState<Address>();
  const [chainId, setChainId] = useState<number>();
  const [ensName, setEnsName] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [pairingUri, setPairingUri] = useState<string>();
  const attempt = useRef(0);
  const inFlight = useRef(false);
  const pendingProvider = useRef<Provider | undefined>(undefined);

  const applyAccounts = useCallback((accounts: unknown) => {
    const account =
      Array.isArray(accounts) &&
      typeof accounts[0] === "string" &&
      isAddress(accounts[0])
        ? getAddress(accounts[0])
        : undefined;
    setAddress(account);
    setEnsName(undefined);
  }, []);

  useEffect(() => {
    if (!provider) return;
    const accountsChanged: Listener = (accounts) => applyAccounts(accounts);
    const chainChanged: Listener = (chain) => {
      const id = Number(chain);
      setChainId(Number.isFinite(id) ? id : undefined);
    };
    const disconnected: Listener = () => {
      setAddress(undefined);
      setChainId(undefined);
      setProvider(undefined);
      setEnsName(undefined);
    };
    provider.on("accountsChanged", accountsChanged);
    provider.on("chainChanged", chainChanged);
    provider.on("disconnect", disconnected);
    return () => {
      provider.removeListener("accountsChanged", accountsChanged);
      provider.removeListener("chainChanged", chainChanged);
      provider.removeListener("disconnect", disconnected);
    };
  }, [provider, applyAccounts]);

  // Restore browser-wallet permissions without opening a connection popup.
  useEffect(() => {
    if (!window.ethereum || sessionStorage.getItem("ux721-disconnected"))
      return;
    let active = true;
    const injected = window.ethereum;
    void Promise.all([
      injected.request({ method: "eth_accounts" }),
      injected.request({ method: "eth_chainId" }),
    ])
      .then(([accounts, chain]) => {
        if (active && accounts.length) {
          setProvider(injected);
          applyAccounts(accounts);
          setChainId(Number(chain));
        }
      })
      .catch(() => {
        /* Explicit connection remains available. */
      });
    return () => {
      active = false;
    };
  }, [applyAccounts]);

  useEffect(() => {
    let active = true;
    setEnsName(undefined);
    if (address)
      void ensClient
        .getEnsName({ address })
        .then(async (name) => {
          // Forward verification prevents an arbitrary reverse record impersonating a name.
          if (!name) return;
          const resolved = await ensClient.getEnsAddress({ name });
          if (active && resolved?.toLowerCase() === address.toLowerCase())
            setEnsName(name);
        })
        .catch(() => {
          /* ENS is optional: preserve the raw address. */
        });
    return () => {
      active = false;
    };
  }, [address]);

  async function connect(method: "injected" | "walletconnect") {
    if (inFlight.current) return;
    inFlight.current = true;
    const id = ++attempt.current;
    setBusy(true);
    setError(undefined);
    try {
      let next: Provider;
      if (method === "injected") {
        if (!window.ethereum)
          throw new Error(
            "Aucun wallet de navigateur détecté. Installe MetaMask ou utilise WalletConnect.",
          );
        next = window.ethereum;
      } else {
        if (!walletConnectId || !/^[a-f0-9]{32}$/i.test(walletConnectId))
          throw new Error(
            "Ajoute ton Project ID Reown (32 caractères) dans VITE_WALLETCONNECT_PROJECT_ID, puis redémarre le serveur.",
          );
        const { EthereumProvider } =
          await import("@walletconnect/ethereum-provider");
        const wc = await EthereumProvider.init({
          projectId: walletConnectId,
          chains: [sepolia.id],
          showQrModal: false,
          rpcMap: { [sepolia.id]: sepoliaRpc },
          metadata: {
            name: "UX 721",
            description: "TD ERC721 UX 101 · Sepolia",
            url: window.location.origin,
            icons: [`${window.location.origin}/favicon.svg`],
          },
        });
        next = wc as unknown as Provider;
        if (id !== attempt.current) return;
        pendingProvider.current = next;
        const displayUri = (uri: string) => {
          if (id === attempt.current) setPairingUri(uri);
        };
        wc.on("display_uri", displayUri);
        try {
          await wc.connect();
        } finally {
          wc.removeListener("display_uri", displayUri);
        }
      }
      if (id !== attempt.current) {
        await next.disconnect?.();
        return;
      }
      const accounts = await next.request({ method: "eth_requestAccounts" });
      const chain = await next.request({ method: "eth_chainId" });
      if (id !== attempt.current) return;
      if (!accounts.length)
        throw new Error(
          "Aucun compte partagé par le wallet. Relance la connexion.",
        );
      setProvider(next);
      applyAccounts(accounts);
      setChainId(Number(chain));
      setPairingUri(undefined);
      sessionStorage.removeItem("ux721-disconnected");
    } catch (cause) {
      if (id === attempt.current) setError(explainError(cause));
    } finally {
      if (id === attempt.current) {
        setBusy(false);
        inFlight.current = false;
        pendingProvider.current = undefined;
        setPairingUri(undefined);
      }
    }
  }

  function cancelPairing() {
    ++attempt.current;
    void pendingProvider.current?.disconnect?.().catch(() => {});
    pendingProvider.current = undefined;
    inFlight.current = false;
    setPairingUri(undefined);
    setBusy(false);
  }

  async function disconnect() {
    cancelPairing();
    setProvider(undefined);
    setAddress(undefined);
    setChainId(undefined);
    setEnsName(undefined);
    setError(undefined);
    sessionStorage.setItem("ux721-disconnected", "1");
    try {
      await provider?.disconnect?.();
    } catch {
      /* Local disconnection is already effective. */
    }
  }

  async function switchNetwork() {
    if (!provider || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(undefined);
    try {
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      } catch (cause) {
        const err = cause as {
          code?: number;
          data?: { originalError?: { code?: number } };
        };
        if (err.code !== 4902 && err.data?.originalError?.code !== 4902)
          throw cause;
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xaa36a7",
              chainName: "Ethereum Sepolia",
              nativeCurrency: {
                name: "Sepolia Ether",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: [sepoliaRpc],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      }
      setChainId(Number(await provider.request({ method: "eth_chainId" })));
    } catch (cause) {
      setError(explainError(cause));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <WalletContext.Provider
      value={{
        provider,
        address,
        chainId,
        ensName,
        busy,
        error,
        pairingUri,
        connect,
        disconnect,
        switchNetwork,
        cancelPairing,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}
export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("WalletProvider manquant");
  return value;
}
