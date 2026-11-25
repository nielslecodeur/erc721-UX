import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { formatEther } from "viem";
import { useWallet } from "../context/WalletContext";
import { useTransactions } from "../context/TransactionContext";
import { publicClient, sepolia } from "../lib/config";
import { useAsync } from "../hooks/useAsync";
import {
  ContractLink,
  Loading,
  Notice,
  PageTitle,
  Retry,
  WalletControls,
} from "../components/ui";

export function ChainInfo() {
  const wallet = useWallet();
  const { revision } = useTransactions();
  const state = useAsync(
    async () => {
      const [block, balance] = await Promise.all([
        publicClient.getBlockNumber(),
        wallet.address
          ? publicClient.getBalance({ address: wallet.address })
          : Promise.resolve(undefined),
      ]);
      return { block, balance };
    },
    `${wallet.address || ""}:${revision}`,
  );
  useEffect(() => {
    const timer = window.setInterval(state.reload, 15_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <>
      <PageTitle
        title="Ta connexion au réseau"
        description="Les données de lecture viennent de Sepolia. Le réseau de ton wallet doit correspondre pour signer."
      />
      <section className="panel">
        <div className="section-heading">
          <h2>Ethereum Sepolia</h2>
          <button className="button small secondary" onClick={state.reload}>
            Actualiser
          </button>
        </div>
        <dl className="data-list">
          <div>
            <dt>Chain ID de lecture</dt>
            <dd>11155111</dd>
          </div>
          <div>
            <dt>Chain ID du wallet</dt>
            <dd>{wallet.chainId ?? "Wallet déconnecté"}</dd>
          </div>
          <div>
            <dt>Dernier bloc</dt>
            <dd>{state.data?.block.toLocaleString("fr-FR") ?? "—"}</dd>
          </div>
          <div>
            <dt>Adresse connectée</dt>
            <dd className="address-full">
              {wallet.address || "Aucun compte connecté"}
            </dd>
          </div>
          <div>
            <dt>Nom ENS primaire · mainnet</dt>
            <dd>{wallet.ensName || "Aucun nom résolu"}</dd>
          </div>
          <div>
            <dt>Solde Sepolia</dt>
            <dd>
              {state.data?.balance !== undefined
                ? `${Number(formatEther(state.data.balance)).toLocaleString("fr-FR", { maximumFractionDigits: 6 })} ETH`
                : "—"}
            </dd>
          </div>
        </dl>
        {state.loading && <Loading />}
        {state.error && <Retry error={state.error} retry={state.reload} />}
        {wallet.address ? (
          <>
            <button
              className="button secondary"
              disabled={wallet.busy}
              onClick={() => void wallet.switchNetwork()}
            >
              Passer sur Sepolia
            </button>
            <p className="muted">
              Si Sepolia est absent, l’application propose de l’ajouter à ton
              wallet.
            </p>
            <ContractLink
              address={wallet.address}
              label="Voir mon compte sur Etherscan"
            />
          </>
        ) : (
          <WalletControls />
        )}
      </section>
    </>
  );
}

export function WrongNetwork() {
  const wallet = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from || "/chain-info";
  useEffect(() => {
    if (wallet.chainId === sepolia.id)
      navigate(
        from.startsWith("/") &&
          !from.startsWith("//") &&
          from !== "/wrong-network"
          ? from
          : "/chain-info",
        { replace: true },
      );
  }, [wallet.chainId, from, navigate]);
  return (
    <>
      <PageTitle
        title="Change de réseau pour continuer."
        description="Ce TD utilise Ethereum Sepolia. Ton wallet est connecté à un autre réseau."
      />
      <section className="panel">
        <Notice tone="error">
          Réseau du wallet : {wallet.chainId ?? "déconnecté"} · Réseau attendu :
          11155111.
        </Notice>
        <p>
          Le bouton ci-dessous demande à ton wallet de changer de réseau. Aucun
          transfert ne sera envoyé.
        </p>
        <button
          className="button"
          disabled={!wallet.address || wallet.busy}
          onClick={() => void wallet.switchNetwork()}
        >
          {wallet.busy ? "Ouvre ton wallet…" : "Passer sur Sepolia"}
        </button>
        <button
          className="button secondary"
          onClick={() => void wallet.disconnect()}
        >
          Déconnecter le wallet
        </button>
        <p>
          <Link to="/">Retour à mon TD</Link>
        </p>
      </section>
    </>
  );
}
