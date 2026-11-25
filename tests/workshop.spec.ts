import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  decodeFunctionData,
  encodeFunctionResult,
  encodeAbiParameters,
  toFunctionSelector,
} from "viem";
import type { Hex } from "viem";
import {
  addresses,
  evaluatorAbi,
  nftAbi,
  pointsAbi,
  claimerAbi,
} from "../src/lib/contracts";
import signatures from "../src/data/signatures.json" with { type: "json" };

const student = "0x4e7f5303BdE72312BF53E7Bc0B51dC216ACB1621";
const secondAccount = "0x1111111111111111111111111111111111111111";
const txHash = `0x${"ab".repeat(32)}`;
const blockHash = `0x${"cd".repeat(32)}`;
const multicallAbi = [
  {
    type: "function",
    name: "aggregate3",
    stateMutability: "payable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
  },
] as const;
const combinedAbi = [...nftAbi, ...evaluatorAbi, ...pointsAbi, ...claimerAbi];

interface State {
  registered: boolean;
  progress: boolean[];
  held: bigint[];
  galleryBalance: bigint;
  receiptStatus: string;
  networkFailure: boolean;
  authorizedSigner: boolean;
  tokenPrice: bigint;
  lastSimulation?: { to: string; data: Hex };
}

async function setup(
  page: Page,
  {
    chain = "0xaa36a7",
    reject = false,
    fallback = false,
    noWallet = false,
  } = {},
) {
  const state: State = {
    registered: false,
    progress: [false, false, false, false],
    held: [0n, 0n, 0n],
    galleryBalance: 0n,
    receiptStatus: "0x1",
    networkFailure: false,
    authorizedSigner: true,
    tokenPrice: 1500000000000000n,
  };
  await page.addInitScript(
    ({ chain, reject, fallback, student, txHash, noWallet }) => {
      if (noWallet) return;
      let currentChain = chain;
      let accounts: string[] = [];
      let added = false;
      const events: Record<string, ((...args: unknown[]) => void)[]> = {};
      const sent: unknown[] = [];
      const requests: string[] = [];
      Object.assign(window, {
        __sent: sent,
        __requests: requests,
        __emit: (event: string, value: unknown) => {
          if (event === "accountsChanged") accounts = value as string[];
          if (event === "chainChanged") currentChain = value as string;
          for (const handler of events[event] || []) handler(value);
        },
        ethereum: {
          on: (event: string, listener: (...args: unknown[]) => void) => {
            (events[event] ||= []).push(listener);
          },
          removeListener: (
            event: string,
            listener: (...args: unknown[]) => void,
          ) => {
            events[event] = (events[event] || []).filter(
              (item) => item !== listener,
            );
          },
          request: async ({
            method,
            params,
          }: {
            method: string;
            params?: unknown[];
          }) => {
            requests.push(method);
            if (method === "eth_accounts") return accounts;
            if (method === "eth_requestAccounts") {
              accounts = [student];
              return accounts;
            }
            if (method === "eth_chainId") return currentChain;
            if (method === "wallet_addEthereumChain") {
              added = true;
              return null;
            }
            if (method === "wallet_switchEthereumChain") {
              if (fallback && !added)
                throw Object.assign(new Error("Unknown chain"), { code: 4902 });
              currentChain = "0xaa36a7";
              for (const handler of events.chainChanged || [])
                handler(currentChain);
              return null;
            }
            if (method === "eth_sendTransaction") {
              if (reject)
                throw Object.assign(new Error("User rejected the request"), {
                  code: 4001,
                });
              sent.push(params?.[0]);
              return txHash;
            }
            throw new Error(`Unmocked wallet method: ${method}`);
          },
        },
      });
    },
    { chain, reject, fallback, student, txHash, noWallet },
  );

  function contractCall(to: string, data: Hex): Hex {
    if (
      data.slice(0, 10) ===
      toFunctionSelector("aggregate3((address,bool,bytes)[])")
    ) {
      const { args } = decodeFunctionData({ abi: multicallAbi, data });
      return encodeFunctionResult({
        abi: multicallAbi,
        functionName: "aggregate3",
        result: args[0].map((call) => {
          try {
            return {
              success: true,
              returnData: contractCall(call.target, call.callData),
            };
          } catch {
            return { success: false, returnData: "0x" as Hex };
          }
        }),
      });
    }
    const { functionName, args = [] } = decodeFunctionData({
      abi: combinedAbi,
      data,
    });
    const target = to.toLowerCase();
    const encode = (result: unknown) =>
      encodeFunctionResult({
        abi: combinedAbi,
        functionName,
        result,
      } as Parameters<typeof encodeFunctionResult>[0]);
    switch (functionName) {
      case "name":
        return encode(
          target === addresses.bayc.toLowerCase()
            ? "Fake Bored Ape Yacht Club"
            : "Fake Nefturians",
        );
      case "totalSupply":
      case "tokenCounter":
        return encode(14n);
      case "tokenPrice":
        return encode(state.tokenPrice);
      case "whitelist":
        return encode(state.authorizedSigner);
      case "decimals":
        return encode(18);
      case "hasSubmitted":
        return encode(state.registered);
      case "exerciseProgression":
        return encode(state.progress[Number(args[1])]);
      case "balanceOf": {
        if (target === addresses.points.toLowerCase())
          return encode(
            BigInt(state.progress.filter(Boolean).length * 2) * 10n ** 18n,
          );
        const index = [
          addresses.bayc,
          addresses.nefturians,
          addresses.meebits,
        ].findIndex((address) => address.toLowerCase() === target);
        return encode(state.galleryBalance || state.held[index] || 0n);
      }
      case "ownerOf": {
        if (BigInt(args[0] as bigint) >= 100n)
          throw new Error("ERC721: invalid token ID");
        return encode(student);
      }
      case "tokenURI":
        return encode(`https://nft-metadata.test/${args[0]}`);
      case "tokenOfOwnerByIndex":
        return encode(BigInt(args[1] as bigint));
      case "maxTokenId":
        return encode(99n);
      case "tokensThatWereClaimed":
        return encode(BigInt(args[0] as bigint) === 0n);
      case "submitExercise":
      case "ex1_claimedFakeBAYC":
      case "ex2_boughtFakeNefturians":
      case "ex3_claimedFakeMeebits":
      case "claimAToken":
      case "buyAToken":
        state.lastSimulation = { to, data };
        return "0x";
      default:
        throw new Error(`Unmocked contract function: ${functionName}`);
    }
  }
  function onReceipt() {
    if (state.receiptStatus !== "0x1" || !state.lastSimulation) return;
    const { functionName } = decodeFunctionData({
      abi: combinedAbi,
      data: state.lastSimulation.data,
    });
    if (functionName === "submitExercise") {
      state.registered = true;
      state.progress[0] = true;
    }
    if (functionName === "buyAToken") state.held[1]++;
    if (functionName === "claimAToken")
      state.held[
        state.lastSimulation.to.toLowerCase() ===
        addresses.claimer.toLowerCase()
          ? 2
          : 0
      ]++;
    const exercise = [
      "ex1_claimedFakeBAYC",
      "ex2_boughtFakeNefturians",
      "ex3_claimedFakeMeebits",
    ].indexOf(functionName);
    if (exercise >= 0) state.progress[exercise + 1] = true;
    state.lastSimulation = undefined;
  }
  await page.route("https://nft-metadata.test/**", (route) =>
    route.fulfill({
      json: {
        image:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
        attributes: [
          { trait_type: "Background", value: "Blue" },
          { trait_type: "Eyes", value: "Sleepy" },
        ],
      },
    }),
  );
  await page.route(
    /https:\/\/(ethereum-sepolia-rpc\.publicnode\.com|rpc\.sepolia\.org|ethereum-rpc\.publicnode\.com)/,
    async (route) => {
      if (state.networkFailure) {
        await route.fulfill({ status: 503, body: "RPC unavailable" });
        return;
      }
      const payload = route.request().postDataJSON();
      function respond(call: {
        id: number;
        method: string;
        params: unknown[];
      }): unknown {
        try {
          let result: unknown;
          switch (call.method) {
            case "eth_chainId":
              result = "0xaa36a7";
              break;
            case "eth_blockNumber":
              result = "0xb9a000";
              break;
            case "eth_getBalance":
              result = "0xde0b6b3a7640000";
              break;
            case "eth_call": {
              const params = call.params[0] as { to: string; data: Hex };
              // ENS calls are optional and deliberately return no name in these tests.
              if (
                !Object.values(addresses).some(
                  (address) =>
                    address.toLowerCase() === params.to.toLowerCase(),
                ) &&
                !params.to.toLowerCase().startsWith("0xca11")
              ) {
                result = "0x";
                break;
              }
              result = contractCall(params.to, params.data);
              break;
            }
            case "eth_getTransactionReceipt":
              onReceipt();
              result = {
                transactionHash: txHash,
                transactionIndex: "0x0",
                blockHash,
                blockNumber: "0xb9a000",
                from: student,
                to: addresses.evaluator,
                cumulativeGasUsed: "0x5208",
                gasUsed: "0x5208",
                contractAddress: null,
                logs: [],
                logsBloom: `0x${"00".repeat(256)}`,
                status: state.receiptStatus,
                effectiveGasPrice: "0x3b9aca00",
                type: "0x2",
              };
              break;
            case "eth_getCode":
              result = "0x6000";
              break;
            default:
              throw new Error(`Unmocked RPC: ${call.method}`);
          }
          return { jsonrpc: "2.0", id: call.id, result };
        } catch (error) {
          const message = (error as Error).message;
          return {
            jsonrpc: "2.0",
            id: call.id,
            error: {
              code: 3,
              message: `execution reverted: ${message}`,
              data: `0x08c379a0${encodeAbiParameters([{ type: "string" }], [message]).slice(2)}`,
            },
          };
        }
      }
      await route.fulfill({
        json: Array.isArray(payload) ? payload.map(respond) : respond(payload),
      });
    },
  );
  return state;
}

async function connect(page: Page) {
  await page
    .getByRole("button", { name: "Connecter mon wallet", exact: true })
    .click();
  await expect(page.getByText("Ton wallet est connecté.")).toBeVisible();
}

test("déconnecté : navigation, erreur sans wallet, configuration et responsive", async ({
  page,
}) => {
  await setup(page, { noWallet: true });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "ERC721 UX 101",
  );
  await page
    .getByRole("button", { name: "Connecter mon wallet", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Aucun wallet");
  await page.getByRole("button", { name: "WalletConnect · QR" }).click();
  await expect(page.getByRole("alert")).toContainText("Project ID");
  await page.screenshot({
    path: "artifacts/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Activer le thème sombre" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Activer le thème clair" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBeTruthy();
  await page.screenshot({
    path: "artifacts/dashboard-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Configuration" })
    .click();
  await expect(
    page.getByText("Project ID à renseigner pour le QR mobile"),
  ).toBeVisible();
});

test("mauvais réseau : redirection, ajout Sepolia, changement de compte et déconnexion", async ({
  page,
}) => {
  await setup(page, { chain: "0x1", fallback: true });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Connecter mon wallet", exact: true })
    .click();
  await expect(page).toHaveURL(/wrong-network/);
  await page
    .getByRole("button", { name: "Passer sur Sepolia", exact: true })
    .click();
  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  expect(
    await page.evaluate(
      () => (window as unknown as { __requests: string[] }).__requests,
    ),
  ).toContain("wallet_addEthereumChain");
  await page.evaluate(
    (address) =>
      (
        window as unknown as { __emit: (event: string, value: unknown) => void }
      ).__emit("accountsChanged", [address]),
    secondAccount,
  );
  await expect(page.locator(".onboarding .address-full")).toHaveText(
    secondAccount,
  );
  await page.getByRole("button", { name: "Déconnecter", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Connecter mon wallet", exact: true }),
  ).toBeVisible();
});

test("inscription : simulation, signature, reçu et progression réelle", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/");
  await connect(page);
  await page.getByRole("button", { name: "M’inscrire", exact: true }).click();
  await expect(
    page.getByText("Transaction confirmée", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("2 / 8", { exact: true })).toBeVisible();
  const sent = await page.evaluate(
    () => (window as unknown as { __sent: { to: string; data: Hex }[] }).__sent,
  );
  expect(sent[0].to.toLowerCase()).toBe(addresses.evaluator.toLowerCase());
  expect(sent[0].data).toBe(toFunctionSelector("submitExercise()"));
  await expect(
    page.getByRole("link", { name: "Reçu Etherscan" }),
  ).toHaveAttribute("href", `https://sepolia.etherscan.io/tx/${txHash}`);
});

test("achat payable : montant relu du contrat, mint puis validation séparée", async ({
  page,
}) => {
  const state = await setup(page);
  state.registered = true;
  state.progress[0] = true;
  await page.goto("/");
  await connect(page);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "FakeNefturians" })
    .click();
  await page
    .getByRole("button", { name: "Acheter · 0.0015 ETH", exact: true })
    .click();
  await expect(
    page.getByText("Transaction confirmée", { exact: false }),
  ).toBeVisible();
  const sent = await page.evaluate(
    () =>
      (window as unknown as { __sent: { value: string; data: Hex }[] }).__sent,
  );
  expect(BigInt(sent[0].value)).toBe(1500000000000000n);
  expect(sent[0].data).toBe(toFunctionSelector("buyAToken()"));
  await page.getByRole("button", { name: "Valider · 2 points" }).click();
  await expect(
    page.getByRole("button", { name: "Validé · 2 pts" }),
  ).toBeVisible();
});

test("refus de signature : erreur utile et aucun point inventé", async ({
  page,
}) => {
  await setup(page, { reject: true });
  await page.goto("/");
  await connect(page);
  await page.getByRole("button", { name: "M’inscrire", exact: true }).click();
  await expect(
    page.getByText("Demande refusée dans le wallet.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("0 / 8", { exact: true })).toBeVisible();
});

test("reçu échoué : action non confirmée et aucun succès affiché", async ({
  page,
}) => {
  const state = await setup(page);
  state.receiptStatus = "0x0";
  await page.goto("/");
  await connect(page);
  await page.getByRole("button", { name: "M’inscrire", exact: true }).click();
  await expect(
    page.getByText("La transaction a été refusée par le contrat.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.getByText("0 / 8", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Transaction confirmée", { exact: false }),
  ).toHaveCount(0);
});

test("détails : attributs sans name/description et NFT inexistant", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/fakeBayc/0");
  await expect(page.getByText("Blue", { exact: true })).toBeVisible();
  await expect(page.getByText("Sleepy", { exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: "FakeBAYC #0" })).toBeVisible();
  await page.goto("/fakeBayc/999");
  await expect(page.getByRole("alert")).toContainText("n’existe pas");
  await page.goto("/fakeBayc/abc");
  await expect(page.getByRole("alert")).toContainText("Identifiant invalide");
});

test("galerie : état vide, adresse invalide et pagination de tous les identifiants", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto(`/fakeBayc/gallery/${student}`);
  await expect(
    page.getByText("Cette adresse ne détient aucun NFT"),
  ).toBeVisible();
  state.galleryBalance = 14n;
  await page.getByRole("button", { name: "Actualiser", exact: true }).click();
  await expect(page.locator(".gallery-tile")).toHaveCount(12);
  await expect(page.locator(".gallery-tile img").first()).toHaveAttribute(
    "loading",
    "lazy",
  );
  await page.getByRole("button", { name: "Suivant", exact: true }).click();
  await expect(page.locator(".gallery-tile")).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "FakeBAYC #13", exact: true }),
  ).toBeVisible();
  await page.goto("/fakeNefturians/not-an-address");
  await expect(page.getByRole("alert")).toContainText(
    "adresse Ethereum n’est pas valide",
  );
});

test("Meebits : exclusion des tokens réclamés et signature correspondant au choix", async ({
  page,
}) => {
  const state = await setup(page);
  state.registered = true;
  state.progress[0] = true;
  await page.goto("/");
  await connect(page);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "FakeMeebits" })
    .click();
  await expect(page.getByLabel("Identifiant disponible")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "FakeMeebit #0", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Identifiant disponible").selectOption("2");
  await expect(page.getByLabel("Signature correspondante")).toHaveValue(
    signatures[2].signature,
  );
  await page
    .getByRole("button", { name: "Réclamer le Meebit", exact: true })
    .click();
  await expect(
    page.getByText("Transaction confirmée", { exact: false }),
  ).toBeVisible();
  const sent = await page.evaluate(
    () =>
      (
        window as unknown as {
          __sent: { to: string; data: Hex; value: string }[];
        }
      ).__sent,
  );
  const decoded = decodeFunctionData({ abi: claimerAbi, data: sent[0].data });
  expect(sent[0].to.toLowerCase()).toBe(addresses.claimer.toLowerCase());
  expect(decoded.args).toEqual([2n, signatures[2].signature]);
  expect(BigInt(sent[0].value || "0x0")).toBe(0n);
});

test("panne RPC : message d’erreur, aucun compteur fictif et reprise", async ({
  page,
}) => {
  const state = await setup(page);
  state.networkFailure = true;
  await page.goto("/fakeBayc");
  await expect(page.getByRole("alert")).toContainText("réseau ne répond pas");
  await expect(
    page.getByRole("button", { name: "Réclamer un NFT", exact: true }),
  ).toBeDisabled();
  state.networkFailure = false;
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Fake Bored Ape Yacht Club",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("le SDK WalletConnect direct se charge dans le navigateur sans AppKit", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const initialized = await page.evaluate(async () => {
    const modulePath =
      "/node_modules/.vite/deps/@walletconnect_ethereum-provider.js";
    const sdk = await import(/* @vite-ignore */ modulePath);
    return typeof sdk.EthereumProvider.init;
  });
  expect(initialized).toBe("function");
  expect(errors).toEqual([]);
});

test("accueil : validation directe d’un NFT deja possede", async ({ page }) => {
  const state = await setup(page);
  state.registered = true;
  state.progress[0] = true;
  state.held[0] = 1n;
  await page.goto("/");
  await connect(page);
  await page
    .getByRole("button", { name: "Valider · 2 points", exact: true })
    .click();
  await expect(page.getByText("4 / 8", { exact: true })).toBeVisible();
  expect(state.progress[1]).toBe(true);
});

test("achat : relire le prix avant la simulation si la valeur affichee a change", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/");
  await connect(page);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "FakeNefturians" })
    .click();
  const buy = page.getByRole("button", {
    name: "Acheter · 0.0015 ETH",
    exact: true,
  });
  await expect(buy).toBeVisible();
  state.tokenPrice = 2000000000000000n;
  await buy.click();
  await expect(
    page.getByText("Transaction confirmée", { exact: false }),
  ).toBeVisible();
  const sent = await page.evaluate(
    () => (window as unknown as { __sent: { value: string }[] }).__sent,
  );
  expect(BigInt(sent[0].value)).toBe(state.tokenPrice);
});

test("Meebits : bloquer une signature non autorisee puis permettre de reverifier", async ({
  page,
}) => {
  const state = await setup(page);
  state.authorizedSigner = false;
  await page.goto("/");
  await connect(page);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "FakeMeebits" })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "signature n’est pas autorisée",
  );
  await expect(
    page.getByRole("button", { name: "Réclamer le Meebit", exact: true }),
  ).toBeDisabled();
  state.authorizedSigner = true;
  await page.getByRole("button", { name: "Actualiser", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Réclamer le Meebit", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
