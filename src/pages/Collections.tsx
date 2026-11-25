import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  encodeAbiParameters,
  formatEther,
  getAddress,
  isAddress,
  keccak256,
  recoverMessageAddress,
} from "viem";
import type { Address, Hex } from "viem";
import { useAsync } from "../hooks/useAsync";
import { useProgress } from "../hooks/useProgress";
import { useWallet } from "../context/WalletContext";
import { useTransactions } from "../context/TransactionContext";
import { addresses, claimerAbi, evaluatorAbi, nftAbi } from "../lib/contracts";
import { explorer, publicClient, shortAddress } from "../lib/config";
import { fetchMetadata } from "../lib/metadata";
import {
  ContractLink,
  Icon,
  Loading,
  NFTImage,
  Notice,
  PageTitle,
  Retry,
  WriteHint,
} from "../components/ui";
import signatures from "../data/signatures.json";

export function Collection({ kind }: { kind: "bayc" | "nefturians" }) {
  const isBayc = kind === "bayc";
  const address = addresses[kind];
  const name = isBayc ? "FakeBAYC" : "FakeNefturians";
  const { address: account } = useWallet();
  const tx = useTransactions();
  const progress = useProgress();
  const [owner, setOwner] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();
  const state = useAsync(async () => {
    const [collectionName, supply, price] = await Promise.all([
      publicClient.readContract({ address, abi: nftAbi, functionName: "name" }),
      publicClient.readContract({
        address,
        abi: nftAbi,
        functionName: "totalSupply",
      }),
      isBayc
        ? Promise.resolve(0n)
        : publicClient.readContract({
            address,
            abi: nftAbi,
            functionName: "tokenPrice",
          }),
    ]);
    return { collectionName, supply, price };
  }, `${kind}:${tx.revision}`);
  useEffect(() => {
    setOwner(account || "");
    setTokenId("");
    setFormError("");
  }, [account, kind]);
  const exercise = isBayc ? 1 : 2;
  const held = progress.data?.balances[exercise - 1] ?? 0n;
  const done = Boolean(progress.data?.progress[exercise]);
  function openGallery(event: FormEvent) {
    event.preventDefault();
    if (!isAddress(owner)) {
      setFormError("Saisis une adresse Ethereum valide (0x et 40 caractères).");
      return;
    }
    setFormError("");
    navigate(
      isBayc
        ? `/fakeBayc/gallery/${getAddress(owner)}`
        : `/fakeNefturians/${getAddress(owner)}`,
    );
  }
  function openToken(event: FormEvent) {
    event.preventDefault();
    if (!/^\d+$/.test(tokenId) || tokenId.length > 77) {
      setFormError("Saisis un identifiant entier positif ou nul.");
      return;
    }
    navigate(`/fakeBayc/${tokenId}`);
  }
  return (
    <>
      <PageTitle
        title={name}
        description={
          isBayc
            ? "Réclame gratuitement un NFT, découvre ses attributs et explore les collections des autres comptes."
            : "Achète un NFT en envoyant le prix demandé par le contrat en ETH de test Sepolia."
        }
      >
        <span className="collection-type">
          {isBayc ? "Mint gratuit" : "Mint payable"}
        </span>
      </PageTitle>
      <WriteHint />
      <section className={`collection-workspace panel ${kind}`}>
        <div className="collection-main">
          <h2>{state.data?.collectionName || name}</h2>
          <ContractLink address={address} />
          <dl className="collection-stats">
            <div>
              <dt>NFT créés</dt>
              <dd>{state.data?.supply.toLocaleString("fr-FR") ?? "—"}</dd>
            </div>
            <div>
              <dt>Prix du mint</dt>
              <dd>
                {state.data ? `${formatEther(state.data.price)} ETH` : "—"}
              </dd>
            </div>
            <div>
              <dt>Dans ton wallet</dt>
              <dd>{progress.data ? held.toString() : "—"}</dd>
            </div>
          </dl>
          <button
            className="button"
            disabled={!account || tx.busy || !state.data}
            onClick={() =>
              void tx.execute({
                label: isBayc
                  ? "Réclamer un FakeBAYC"
                  : "Acheter un FakeNefturian",
                address,
                abi: nftAbi,
                functionName: isBayc ? "claimAToken" : "buyAToken",
                value: isBayc
                  ? 0n
                  : () =>
                      publicClient.readContract({
                        address,
                        abi: nftAbi,
                        functionName: "tokenPrice",
                      }),
              })
            }
          >
            {isBayc
              ? "Réclamer un NFT"
              : `Acheter${state.data ? ` · ${formatEther(state.data.price)} ETH` : ""}`}
          </button>
          <p className="muted">
            {isBayc
              ? "Mint sans prix d’achat. "
              : "Le prix est relu depuis le contrat. "}
            Des frais de réseau Sepolia s’ajoutent.
          </p>
        </div>
      </section>
      {state.loading && <Loading />}
      {state.error && <Retry error={state.error} retry={state.reload} />}
      {progress.error && (
        <Retry error={progress.error} retry={progress.reload} />
      )}
      <section className="validation-row">
        <div>
          <h2>{done ? "Exercice validé." : "Fais compter ton NFT."}</h2>
          <p>
            {done
              ? "Les 2 points automatiques ont été attribués à cette adresse."
              : !progress.data?.registered
                ? "Inscris ton adresse depuis « Mon TD », puis possède un NFT de cette collection."
                : held === 0n
                  ? "Réclame ou achète d’abord un NFT avec ce compte."
                  : "Ton wallet possède un NFT. Demande les 2 points à l’évaluateur."}
          </p>
        </div>
        <button
          className="button secondary"
          disabled={
            !account ||
            tx.busy ||
            !progress.data?.registered ||
            held === 0n ||
            done
          }
          onClick={() =>
            void tx.execute({
              label: `Valider ${name}`,
              address: addresses.evaluator,
              abi: evaluatorAbi,
              functionName: isBayc
                ? "ex1_claimedFakeBAYC"
                : "ex2_boughtFakeNefturians",
            })
          }
        >
          {done ? (
            <>
              <Icon name="check" size={16} />
              Validé · 2 pts
            </>
          ) : (
            "Valider · 2 points"
          )}
        </button>
      </section>
      <div className="explore-grid">
        <section>
          <h2>Explorer un wallet</h2>
          <p>
            Retrouve tous les NFT de cette collection détenus par une adresse.
          </p>
          <form onSubmit={openGallery}>
            <label htmlFor="gallery-owner">Adresse du propriétaire</label>
            <input
              id="gallery-owner"
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="0x…"
              spellCheck={false}
              autoComplete="off"
              required
            />
            <button className="button secondary" type="submit">
              Ouvrir la galerie
            </button>
          </form>
        </section>
        {isBayc && (
          <section>
            <h2>Voir un NFT</h2>
            <p>
              Consulte l’image, le propriétaire et les attributs d’un
              identifiant.
            </p>
            <form onSubmit={openToken}>
              <label htmlFor="token-id">Identifiant du NFT</label>
              <input
                id="token-id"
                inputMode="numeric"
                value={tokenId}
                onChange={(event) => setTokenId(event.target.value)}
                placeholder="Ex. 0"
                required
              />
              <button className="button secondary" type="submit">
                Consulter le NFT
              </button>
            </form>
          </section>
        )}
      </div>
      {formError && <Notice tone="error">{formError}</Notice>}
    </>
  );
}

function GalleryTile({
  address,
  tokenId,
  isBayc,
}: {
  address: Address;
  tokenId: bigint;
  isBayc: boolean;
}) {
  const state = useAsync(async () => {
    const uri = await publicClient.readContract({
      address,
      abi: nftAbi,
      functionName: "tokenURI",
      args: [tokenId],
    });
    return fetchMetadata(uri);
  }, `${address}:${tokenId}`);
  const content = (
    <>
      <div className="tile-media">
        {state.loading ? (
          <Loading label="Métadonnées…" />
        ) : (
          <NFTImage
            uri={state.data?.image}
            label={`${isBayc ? "FakeBAYC" : "FakeNefturian"} #${tokenId}`}
          />
        )}
      </div>
      <div className="tile-caption">
        <h3>
          {isBayc ? "FakeBAYC" : "FakeNefturian"} #{tokenId.toString()}
        </h3>
        {state.error ? (
          <p>Image indisponible</p>
        ) : (
          <p>{state.data?.name || "NFT sur Sepolia"}</p>
        )}
      </div>
    </>
  );
  return (
    <article className="gallery-tile">
      {isBayc ? (
        <Link to={`/fakeBayc/${tokenId}`}>{content}</Link>
      ) : (
        <a
          href={`${explorer}/nft/${address}/${tokenId}`}
          target="_blank"
          rel="noreferrer"
        >
          {content}
        </a>
      )}
    </article>
  );
}

export function Gallery({ kind }: { kind: "bayc" | "nefturians" }) {
  const { address: parameter = "" } = useParams();
  const { revision } = useTransactions();
  const [page, setPage] = useState(0);
  const valid = isAddress(parameter);
  const isBayc = kind === "bayc";
  const contract = addresses[kind];
  const pageSize = 12;
  useEffect(() => setPage(0), [parameter, kind]);
  const state = useAsync(async () => {
    if (!valid)
      throw new Error(
        "Cette adresse Ethereum n’est pas valide. Reviens à la collection et saisis une adresse 0x complète.",
      );
    const owner = getAddress(parameter);
    const balance = await publicClient.readContract({
      address: contract,
      abi: nftAbi,
      functionName: "balanceOf",
      args: [owner],
    });
    const start = BigInt(page * pageSize);
    const count = Number(
      balance > start
        ? balance - start > BigInt(pageSize)
          ? BigInt(pageSize)
          : balance - start
        : 0n,
    );
    const ids = count
      ? await publicClient.multicall({
          allowFailure: false,
          contracts: Array.from({ length: count }, (_, index) => ({
            address: contract,
            abi: nftAbi,
            functionName: "tokenOfOwnerByIndex" as const,
            args: [owner, start + BigInt(index)] as const,
          })),
        })
      : [];
    return { balance, ids };
  }, `${parameter}:${kind}:${page}:${revision}`);
  return (
    <>
      <Link className="back-link" to={isBayc ? "/fakeBayc" : "/fakeNefturians"}>
        Retour à la collection
      </Link>
      <PageTitle
        title={`Galerie ${isBayc ? "FakeBAYC" : "FakeNefturians"}`}
        description={
          valid
            ? `NFT détenus par ${shortAddress(parameter)}. Les images se chargent à mesure de ta visite.`
            : "Adresse de propriétaire invalide."
        }
      />
      {valid && <p className="address-full">{getAddress(parameter)}</p>}
      {state.loading && <Loading label="Recherche des NFT du propriétaire…" />}
      {state.error && <Retry error={state.error} retry={state.reload} />}
      {state.data && (
        <>
          <div className="section-heading">
            <h2>{state.data.balance.toString()} NFT dans ce wallet</h2>
            <button className="button small secondary" onClick={state.reload}>
              Actualiser
            </button>
          </div>
          {state.data.balance === 0n ? (
            <section className="empty-state panel">
              <Icon name="grid" size={36} />
              <h2>La collection commence ici.</h2>
              <p>Cette adresse ne détient aucun NFT de cette collection.</p>
              <Link
                className="button secondary"
                to={isBayc ? "/fakeBayc" : "/fakeNefturians"}
              >
                Retour au mint
              </Link>
            </section>
          ) : (
            <>
              <div className="gallery-grid">
                {state.data.ids.map((id) => (
                  <GalleryTile
                    key={id.toString()}
                    address={contract}
                    tokenId={id}
                    isBayc={isBayc}
                  />
                ))}
              </div>
              <div className="pagination">
                <button
                  className="button small secondary"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Précédent
                </button>
                <span>Page {page + 1} · 12 NFT maximum par page</span>
                <button
                  className="button small secondary"
                  disabled={BigInt((page + 1) * pageSize) >= state.data.balance}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Suivant
                </button>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

export function TokenDetail() {
  const { tokenId = "" } = useParams();
  const state = useAsync(async () => {
    if (!/^\d+$/.test(tokenId) || tokenId.length > 77)
      throw new Error(
        "Identifiant invalide. Utilise un entier positif ou nul.",
      );
    // Existence is checked before metadata: a broken gateway is not a missing NFT.
    let owner: Address;
    try {
      owner = await publicClient.readContract({
        address: addresses.bayc,
        abi: nftAbi,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      });
    } catch (error) {
      if (/revert|nonexistent|invalid token/i.test(String(error)))
        throw new Error(
          `Le NFT #${tokenId} n’existe pas dans FakeBAYC. Vérifie son identifiant ou réclame un nouveau NFT.`,
        );
      throw error;
    }
    const uri = await publicClient.readContract({
      address: addresses.bayc,
      abi: nftAbi,
      functionName: "tokenURI",
      args: [BigInt(tokenId)],
    });
    return { owner, uri };
  }, tokenId);
  const metadata = useAsync(
    async () => (state.data ? fetchMetadata(state.data.uri) : null),
    state.data?.uri || "",
  );
  return (
    <>
      <Link to="/fakeBayc" className="back-link">
        Retour à FakeBAYC
      </Link>
      <PageTitle
        title={`FakeBAYC #${tokenId}`}
        description="Image et attributs issus de l’URI stockée dans le contrat."
      />
      {state.loading && <Loading />}
      {state.error && <Retry error={state.error} retry={state.reload} />}
      {state.data && (
        <div className="token-detail">
          <div className="detail-media">
            {metadata.loading ? (
              <Loading label="Lecture des métadonnées…" />
            ) : (
              <NFTImage
                uri={metadata.data?.image}
                label={`FakeBAYC #${tokenId}`}
                eager
              />
            )}
          </div>
          <div>
            <h2>{metadata.data?.name || `FakeBAYC #${tokenId}`}</h2>
            {metadata.data?.description && <p>{metadata.data.description}</p>}
            <dl className="data-list">
              <div>
                <dt>Propriétaire</dt>
                <dd>
                  <Link
                    className="address-full"
                    to={`/fakeBayc/gallery/${state.data.owner}`}
                  >
                    {state.data.owner}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>Identifiant</dt>
                <dd>{tokenId}</dd>
              </div>
            </dl>
            <a
              className="text-link"
              href={`${explorer}/nft/${addresses.bayc}/${tokenId}`}
              target="_blank"
              rel="noreferrer"
            >
              Voir le NFT sur Etherscan
              <Icon name="external" size={14} />
            </a>
            {metadata.error && (
              <Retry error={metadata.error} retry={metadata.reload} />
            )}
            <h3 className="attributes-heading">Attributs</h3>
            {metadata.data?.attributes.length ? (
              <dl className="attributes">
                {metadata.data.attributes.map((attribute, index) => (
                  <div key={`${attribute.trait_type}:${index}`}>
                    <dt>{attribute.trait_type}</dt>
                    <dd>{attribute.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              !metadata.loading && (
                <p className="muted">
                  Aucun attribut disponible dans les métadonnées.
                </p>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function Meebits() {
  const { address } = useWallet();
  const tx = useTransactions();
  const progress = useProgress();
  const [selection, setSelection] = useState("");
  const state = useAsync(async () => {
    const maxId = await publicClient.readContract({
      address: addresses.claimer,
      abi: claimerAbi,
      functionName: "maxTokenId",
    });
    const entries = signatures.filter(
      (entry) => BigInt(entry.tokenNumber) <= maxId,
    );
    const claimed = await publicClient.multicall({
      allowFailure: false,
      contracts: entries.map((entry) => ({
        address: addresses.claimer,
        abi: claimerAbi,
        functionName: "tokensThatWereClaimed" as const,
        args: [BigInt(entry.tokenNumber)] as const,
      })),
    });
    return { maxId, available: entries.filter((_, index) => !claimed[index]) };
  }, String(tx.revision));
  useEffect(() => {
    if (
      state.data &&
      !state.data.available.some(
        (entry) => String(entry.tokenNumber) === selection,
      )
    )
      setSelection(
        state.data.available[0]
          ? String(state.data.available[0].tokenNumber)
          : "",
      );
  }, [state.data, selection]);
  const selected = state.data?.available.find(
    (entry) => String(entry.tokenNumber) === selection,
  );
  const signatureState = useAsync(
    async () => {
      if (!selected) return null;
      const hash = keccak256(
        encodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }],
          [addresses.meebits, BigInt(selected.tokenNumber)],
        ),
      );
      const signer = await recoverMessageAddress({
        message: { raw: hash },
        signature: selected.signature as Hex,
      });
      const authorized = await publicClient.readContract({
        address: addresses.claimer,
        abi: claimerAbi,
        functionName: "whitelist",
        args: [signer],
      });
      return { signer, authorized };
    },
    `${selected?.signature || ""}:${tx.revision}`,
  );
  const held = progress.data?.balances[2] ?? 0n;
  const done = Boolean(progress.data?.progress[3]);
  return (
    <>
      <PageTitle
        title="FakeMeebits"
        description="Une signature autorise le mint d’un identifiant précis. Choisis le tien parmi ceux encore disponibles."
      >
        <span className="collection-type">Mint avec signature</span>
      </PageTitle>
      <WriteHint />
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>Choisir mon Meebit</h2>
            <p>
              Disponibilité vérifiée sur le contrat, signatures fournies par le
              TD.
            </p>
          </div>
          <button
            className="button small secondary"
            onClick={() => {
              state.reload();
              signatureState.reload();
            }}
            disabled={state.loading}
          >
            Actualiser
          </button>
        </div>
        {state.loading && (
          <Loading label="Vérification des identifiants disponibles…" />
        )}
        {state.error && <Retry error={state.error} retry={state.reload} />}
        {state.data && (
          <>
            <div className="meebits-status">
              <span>
                <strong>{state.data.available.length}</strong> identifiants
                disponibles parmi les {signatures.length} signatures du TD
              </span>
              <span>
                Identifiant maximum du contrat : {state.data.maxId.toString()}
              </span>
            </div>
            {!state.data.available.length ? (
              <Notice>
                Tous les identifiants signés du fichier fourni sont déjà
                réclamés. Demande au professeur de nouvelles signatures ou un
                contrat mis à jour.
              </Notice>
            ) : (
              <div className="signature-form">
                <label htmlFor="meebit-id">Identifiant disponible</label>
                <select
                  id="meebit-id"
                  value={selection}
                  onChange={(event) => setSelection(event.target.value)}
                >
                  {state.data.available.map((entry) => (
                    <option key={entry.tokenNumber} value={entry.tokenNumber}>
                      FakeMeebit #{entry.tokenNumber}
                    </option>
                  ))}
                </select>
                <label htmlFor="meebit-signature">
                  Signature correspondante · output-sig.json
                </label>
                <textarea
                  id="meebit-signature"
                  readOnly
                  value={selected?.signature || ""}
                  rows={3}
                />
                <button
                  className="button"
                  disabled={
                    !address ||
                    !selected ||
                    tx.busy ||
                    signatureState.loading ||
                    !signatureState.data?.authorized
                  }
                  onClick={() => {
                    if (selected)
                      void tx.execute({
                        label: `Réclamer le FakeMeebit #${selected.tokenNumber}`,
                        address: addresses.claimer,
                        abi: claimerAbi,
                        functionName: "claimAToken",
                        args: [
                          BigInt(selected.tokenNumber),
                          selected.signature as Hex,
                        ],
                        value: 0n,
                      });
                  }}
                >
                  Réclamer le Meebit
                </button>
                {selected && signatureState.loading && (
                  <Loading label="Vérification de la signature…" />
                )}
                {signatureState.error && (
                  <Retry
                    error={signatureState.error}
                    retry={signatureState.reload}
                  />
                )}
                {signatureState.data && !signatureState.data.authorized && (
                  <Notice tone="error">
                    Cette signature n’est pas autorisée par le contrat. Choisis
                    un autre identifiant ou consulte le professeur.
                  </Notice>
                )}
                <p className="muted">
                  La signature vient du fichier du TD. Tu signes uniquement la
                  transaction de mint dans ton wallet. Pas de pourboire envoyé.
                </p>
              </div>
            )}
          </>
        )}
        <div className="contract-links">
          <ContractLink
            address={addresses.claimer}
            label="Contrat de réclamation"
          />
          <ContractLink
            address={addresses.meebits}
            label="Collection FakeMeebits"
          />
        </div>
      </section>
      {progress.error && (
        <Retry error={progress.error} retry={progress.reload} />
      )}
      <section className="validation-row">
        <div>
          <h2>{done ? "Exercice validé." : "Valide ton dernier mint."}</h2>
          <p>
            {done
              ? "Les 2 points automatiques ont été attribués."
              : !progress.data?.registered
                ? "Inscris ton adresse depuis « Mon TD » avant de valider."
                : `FakeMeebits dans ton wallet : ${held}. Possède au moins un NFT pour valider.`}
          </p>
        </div>
        <button
          className="button secondary"
          disabled={
            !address ||
            tx.busy ||
            !progress.data?.registered ||
            held === 0n ||
            done
          }
          onClick={() =>
            void tx.execute({
              label: "Valider FakeMeebits",
              address: addresses.evaluator,
              abi: evaluatorAbi,
              functionName: "ex3_claimedFakeMeebits",
            })
          }
        >
          {done ? "Validé · 2 pts" : "Valider · 2 points"}
        </button>
      </section>
    </>
  );
}
