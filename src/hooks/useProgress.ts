import { formatUnits } from "viem";
import { useAsync } from "./useAsync";
import { useWallet } from "../context/WalletContext";
import { useTransactions } from "../context/TransactionContext";
import { addresses, evaluatorAbi, pointsAbi, nftAbi } from "../lib/contracts";
import { publicClient } from "../lib/config";

export function useProgress() {
  const { address } = useWallet();
  const { revision } = useTransactions();
  return useAsync(
    async () => {
      if (!address) return null;
      const [registered, progress, points, decimals, balances] =
        await Promise.all([
          publicClient.readContract({
            address: addresses.evaluator,
            abi: evaluatorAbi,
            functionName: "hasSubmitted",
            args: [address],
          }),
          publicClient.multicall({
            allowFailure: false,
            contracts: [0n, 1n, 2n, 3n].map((id) => ({
              address: addresses.evaluator,
              abi: evaluatorAbi,
              functionName: "exerciseProgression" as const,
              args: [address, id] as const,
            })),
          }),
          publicClient.readContract({
            address: addresses.points,
            abi: pointsAbi,
            functionName: "balanceOf",
            args: [address],
          }),
          publicClient.readContract({
            address: addresses.points,
            abi: pointsAbi,
            functionName: "decimals",
          }),
          publicClient.multicall({
            allowFailure: false,
            contracts: [
              addresses.bayc,
              addresses.nefturians,
              addresses.meebits,
            ].map((collection) => ({
              address: collection,
              abi: nftAbi,
              functionName: "balanceOf" as const,
              args: [address] as const,
            })),
          }),
        ]);
      return {
        registered,
        progress,
        points: formatUnits(points, decimals),
        balances,
        automaticPoints: progress.filter(Boolean).length * 2,
      };
    },
    `${address || ""}:${revision}`,
  );
}
