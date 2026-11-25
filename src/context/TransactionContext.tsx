import { createContext, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createWalletClient, custom, getAddress } from "viem";
import type { Abi, Address, Hash } from "viem";
import { publicClient, sepolia } from "../lib/config";
import { explainError } from "../lib/errors";
import { useWallet } from "./WalletContext";

interface Action {
  label: string;
  address: Address;
  abi: Abi;
  functionName: string;
  args?: readonly unknown[];
  value?: bigint | (() => Promise<bigint>);
}
export interface Transaction {
  id: number;
  label: string;
  account: Address;
  phase: "simulation" | "signature" | "pending" | "success" | "error";
  hash?: Hash;
  message?: string;
}
interface TransactionState {
  transactions: Transaction[];
  busy: boolean;
  revision: number;
  execute: (action: Action) => Promise<boolean>;
}
const TransactionContext = createContext<TransactionState | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { provider, address } = useWallet();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const locked = useRef(false);
  async function execute(action: Action): Promise<boolean> {
    if (locked.current || !provider || !address) return false;
    locked.current = true;
    setBusy(true);
    const id = Date.now();
    const update = (patch: Partial<Transaction>) =>
      setTransactions((items) =>
        items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    setTransactions((items) =>
      [
        {
          id,
          label: action.label,
          account: address,
          phase: "simulation" as const,
        },
        ...items,
      ].slice(0, 8),
    );
    try {
      const assertWallet = async () => {
        const [accounts, chain] = await Promise.all([
          provider.request({ method: "eth_accounts" }),
          provider.request({ method: "eth_chainId" }),
        ]);
        if (Number(chain) !== sepolia.id)
          throw new Error("Passe ton wallet sur Sepolia avant de continuer.");
        if (!accounts[0] || getAddress(accounts[0]) !== address)
          throw new Error(
            "Le compte a changé. Vérifie le compte actif et réessaie.",
          );
      };
      await assertWallet();
      const value =
        typeof action.value === "function"
          ? await action.value()
          : action.value;
      const { request } = await publicClient.simulateContract({
        address: action.address,
        abi: action.abi,
        functionName: action.functionName,
        args: action.args,
        value,
        account: address,
      });
      await assertWallet();
      update({ phase: "signature" });
      const wallet = createWalletClient({
        account: address,
        chain: sepolia,
        transport: custom(provider),
      });
      const hash = await wallet.writeContract(request);
      update({ phase: "pending", hash });
      let cancelled = false;
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 180_000,
        onReplaced: ({ reason, transaction }) => {
          cancelled = reason === "cancelled" || reason === "replaced";
          update({ hash: transaction.hash });
        },
      });
      if (cancelled)
        throw new Error(
          "Transaction annulée ou remplacée dans le wallet. L’action du TD n’est pas confirmée.",
        );
      if (receipt.status !== "success")
        throw new Error(
          "La transaction a été refusée par le contrat. Consulte le reçu Etherscan.",
        );
      update({ phase: "success", hash: receipt.transactionHash });
      setRevision((v) => v + 1);
      return true;
    } catch (cause) {
      const timedOut = /timed out|timeout/i.test(String(cause));
      update({
        phase: "error",
        message: timedOut
          ? "Confirmation non reçue à temps. Vérifie le reçu Etherscan avant de réessayer : la transaction peut encore être confirmée."
          : explainError(cause),
      });
      return false;
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <TransactionContext.Provider
      value={{ transactions, busy, revision, execute }}
    >
      {children}
    </TransactionContext.Provider>
  );
}
export function useTransactions() {
  const value = useContext(TransactionContext);
  if (!value) throw new Error("TransactionProvider manquant");
  return value;
}
