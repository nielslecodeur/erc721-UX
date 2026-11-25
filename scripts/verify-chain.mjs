import {
  createPublicClient,
  encodeAbiParameters,
  http,
  keccak256,
  recoverMessageAddress,
} from "viem";
import { sepolia } from "viem/chains";
import { loadEnv } from "vite";
import { readFile } from "node:fs/promises";
import {
  addresses,
  claimerAbi,
  evaluatorAbi,
  nftAbi,
  pointsAbi,
} from "../src/lib/contracts.ts";

// Read-only check. Never requests a private key or sends a transaction.
const env = loadEnv("development", process.cwd(), "");
const client = createPublicClient({
  chain: sepolia,
  transport: http(
    env.VITE_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
    { timeout: 15_000, retryCount: 0 },
  ),
});
const student =
  env.VITE_STUDENT_ADDRESS || "0x4e7f5303BdE72312BF53E7Bc0B51dC216ACB1621";
let failed = false;
try {
  if ((await client.getChainId()) !== sepolia.id)
    throw new Error("RPC is not Sepolia");
  console.log(`Sepolia block: ${await client.getBlockNumber()}`);
  for (const [name, address] of Object.entries(addresses)) {
    const code = await client.getCode({ address });
    if (!code || code === "0x") {
      console.error(`${name}: NO CONTRACT at ${address}`);
      failed = true;
    } else console.log(`${name}: deployed`);
  }
  if (failed)
    throw new Error(
      "One or more workshop contract addresses have no deployed code. Ask the teacher for updated addresses.",
    );
  console.log(
    `Student registered: ${await client.readContract({ address: addresses.evaluator, abi: evaluatorAbi, functionName: "hasSubmitted", args: [student] })}`,
  );
  console.log(
    `Points raw: ${await client.readContract({ address: addresses.points, abi: pointsAbi, functionName: "balanceOf", args: [student] })}`,
  );
  for (const name of ["bayc", "nefturians"]) {
    console.log(
      `${name}: ${await client.readContract({ address: addresses[name], abi: nftAbi, functionName: "name" })}; supply=${await client.readContract({ address: addresses[name], abi: nftAbi, functionName: "totalSupply" })}`,
    );
  }
  console.log(
    `Nefturians price wei: ${await client.readContract({ address: addresses.nefturians, abi: nftAbi, functionName: "tokenPrice" })}`,
  );
  const linked = await client.readContract({
    address: addresses.claimer,
    abi: claimerAbi,
    functionName: "fakeMeebits",
  });
  if (linked.toLowerCase() !== addresses.meebits.toLowerCase())
    throw new Error("Claimer targets a different Meebits collection");
  const signatures = JSON.parse(
    await readFile(
      new URL("../src/data/signatures.json", import.meta.url),
      "utf8",
    ),
  );
  const entry = signatures[0];
  const hash = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [addresses.meebits, BigInt(entry.tokenNumber)],
    ),
  );
  const signer = await recoverMessageAddress({
    message: { raw: hash },
    signature: entry.signature,
  });
  const authorized = await client.readContract({
    address: addresses.claimer,
    abi: claimerAbi,
    functionName: "whitelist",
    args: [signer],
  });
  console.log(`First upstream signature authorized: ${authorized}`);
  if (!authorized)
    throw new Error(
      "Upstream signatures do not match the deployed claimer whitelist; teacher intervention required",
    );
} catch (error) {
  failed = true;
  console.error(error.shortMessage || error.message);
}
process.exitCode = failed ? 1 : 0;
