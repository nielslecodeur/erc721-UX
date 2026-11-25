export interface Metadata {
  name?: string;
  description?: string;
  image?: string;
  attributes: { trait_type: string; value: string }[];
}
const cache = new Map<string, Promise<Metadata>>();
const gateways = [
  "https://ipfs.io/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://dweb.link/ipfs/",
];

export function ipfsPath(uri: string): string | null {
  if (uri.startsWith("ipfs://")) return uri.slice(7).replace(/^ipfs\//, "");
  try {
    return new URL(uri).pathname.split("/ipfs/")[1] || null;
  } catch {
    return null;
  }
}

export function imageSources(uri?: string): string[] {
  if (!uri) return [];
  const ipfs = ipfsPath(uri);
  if (ipfs) return gateways.map((gateway) => gateway + ipfs);
  try {
    const url = new URL(uri);
    if (
      ["http:", "https:"].includes(url.protocol) ||
      /^data:image\/(png|jpeg|webp|gif);base64,/i.test(uri)
    )
      return [uri];
  } catch {
    /* Unsupported or invalid media URI. */
  }
  return [];
}

function normalize(data: unknown): Metadata {
  if (!data || typeof data !== "object")
    throw new Error("Les métadonnées ne sont pas un objet JSON valide.");
  const value = data as Record<string, unknown>;
  return {
    name: typeof value.name === "string" ? value.name : undefined,
    description:
      typeof value.description === "string" ? value.description : undefined,
    image: typeof value.image === "string" ? value.image : undefined,
    attributes: Array.isArray(value.attributes)
      ? value.attributes
          .filter((a) => a && typeof a === "object")
          .map((a) => ({
            trait_type: String(a.trait_type || "Attribut"),
            value: String(a.value ?? "—"),
          }))
      : [],
  };
}

export function fetchMetadata(uri: string): Promise<Metadata> {
  const existing = cache.get(uri);
  if (existing) return existing;
  const promise = (async () => {
    if (uri.startsWith("data:application/json")) {
      const comma = uri.indexOf(",");
      return normalize(
        JSON.parse(
          uri.slice(0, comma).includes(";base64")
            ? atob(uri.slice(comma + 1))
            : decodeURIComponent(uri.slice(comma + 1)),
        ),
      );
    }
    const ipfs = ipfsPath(uri);
    const urls = ipfs ? gateways.map((gateway) => gateway + ipfs) : [uri];
    for (const url of urls) {
      try {
        if (!/^https?:\/\//i.test(url)) continue;
        const response = await fetch(url, {
          signal: AbortSignal.timeout(6500),
        });
        if (!response.ok) continue;
        return normalize(await response.json());
      } catch {
        /* Try the next gateway, with a bounded timeout. */
      }
    }
    throw new Error(
      "Métadonnées indisponibles : le serveur de la collection ne répond pas. Le NFT reste consultable sur Etherscan.",
    );
  })();
  cache.set(uri, promise);
  void promise.catch(() => cache.delete(uri));
  return promise;
}
