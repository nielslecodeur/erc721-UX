import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import { useWallet } from "../context/WalletContext";
import { useTransactions } from "../context/TransactionContext";
import { explorer, shortAddress } from "../lib/config";
import { imageSources } from "../lib/metadata";

export function Icon({
  name,
  size = 20,
}: {
  name:
    | "arrow"
    | "check"
    | "wallet"
    | "grid"
    | "network"
    | "settings"
    | "sun"
    | "moon"
    | "external"
    | "refresh";
  size?: number;
}) {
  const paths = {
    arrow: "M5 12h14m-6-6 6 6-6 6",
    check: "m5 12 4 4L19 6",
    wallet: "M20 8V5H4v14h16V8H4m12 3h4v4h-4z",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    network: "M12 3v7M5 20v-6h14v6M12 10v4M8 3h8M2 20h6m8 0h6",
    settings: "M4 6h16M4 12h16M4 18h16M8 3v6m8 0v6m-6 0v6",
    sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    moon: "M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13",
    external: "M14 3h7v7m0-7L10 14M10 3H3v18h18v-7",
    refresh: "M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success";
}) {
  return (
    <div
      className={`notice ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Loading({
  label = "Lecture de la blockchain…",
}: {
  label?: string;
}) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {label}
    </div>
  );
}
export function Retry({ error, retry }: { error: string; retry: () => void }) {
  return (
    <Notice tone="error">
      <p>{error}</p>
      <button className="button small secondary" onClick={retry}>
        <Icon name="refresh" size={16} />
        Réessayer
      </button>
    </Notice>
  );
}
export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
export function ContractLink({
  address,
  label = "Voir le contrat",
}: {
  address: string;
  label?: string;
}) {
  return (
    <a
      className="text-link"
      href={`${explorer}/address/${address}`}
      target="_blank"
      rel="noreferrer"
    >
      {label}
      <Icon name="external" size={14} />
    </a>
  );
}

export function WalletControls({ compact = false }: { compact?: boolean }) {
  const wallet = useWallet();
  if (wallet.address)
    return (
      <div className="wallet-connected">
        <a
          href={`${explorer}/address/${wallet.address}`}
          title={wallet.address}
          target="_blank"
          rel="noreferrer"
          className="wallet-address"
        >
          <span className="status-dot" />
          {wallet.ensName || shortAddress(wallet.address)}
        </a>
        {!compact && (
          <button
            className="button small secondary"
            onClick={() => void wallet.disconnect()}
          >
            Déconnecter
          </button>
        )}
      </div>
    );
  return (
    <div className="wallet-options">
      <button
        className="button"
        disabled={wallet.busy}
        onClick={() => void wallet.connect("injected")}
      >
        <Icon name="wallet" size={18} />
        {wallet.busy
          ? "Connexion…"
          : compact
            ? "Connecter"
            : "Connecter mon wallet"}
      </button>
      {!compact && (
        <button
          className="button secondary"
          disabled={wallet.busy}
          onClick={() => void wallet.connect("walletconnect")}
        >
          WalletConnect · QR
        </button>
      )}
      {wallet.busy && !wallet.pairingUri && !compact && (
        <button className="button small quiet" onClick={wallet.cancelPairing}>
          Annuler la connexion
        </button>
      )}
    </div>
  );
}

export function PairingPanel() {
  const { pairingUri, cancelPairing } = useWallet();
  const [image, setImage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setImage("");
    setFailed(false);
    if (pairingUri)
      void QRCode.toDataURL(pairingUri, {
        width: 300,
        margin: 2,
        errorCorrectionLevel: "M",
      })
        .then((url) => {
          if (active) setImage(url);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
    };
  }, [pairingUri]);
  if (!pairingUri) return null;
  return (
    <section className="pairing panel" aria-label="Connexion WalletConnect">
      <div>
        <h2>Connecte ton wallet mobile</h2>
        <p>Scanne ce QR code avec la fonction WalletConnect de ton wallet.</p>
        <button className="button secondary" onClick={cancelPairing}>
          Annuler
        </button>
      </div>
      {image ? (
        <img
          src={image}
          alt="QR code de connexion WalletConnect"
          width={260}
          height={260}
        />
      ) : failed ? (
        <Notice tone="error">QR indisponible. Annule puis réessaie.</Notice>
      ) : (
        <Loading label="Génération du QR code…" />
      )}
    </section>
  );
}

export function NFTImage({
  uri,
  label,
  eager = false,
}: {
  uri?: string;
  label: string;
  eager?: boolean;
}) {
  const urls = imageSources(uri);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [uri]);
  if (!urls[index])
    return (
      <div className="nft-placeholder">
        <Icon name="grid" size={36} />
        <span>{uri ? "Image indisponible" : "Aucune image fournie"}</span>
      </div>
    );
  return (
    <img
      className="nft-image"
      src={urls[index]}
      alt={label}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

export function TransactionFeed() {
  const { transactions } = useTransactions();
  if (!transactions.length) return null;
  const phaseLabel = {
    simulation: "Vérification du contrat",
    signature: "À confirmer dans le wallet",
    pending: "Confirmation sur Sepolia…",
    success: "Transaction confirmée",
    error: "Action non confirmée",
  };
  return (
    <section
      className="transaction-feed"
      aria-label="Transactions"
      aria-live="polite"
    >
      <h2>Transactions</h2>
      {transactions.map((tx) => (
        <article className={`transaction ${tx.phase}`} key={tx.id}>
          <span
            className={`tx-mark ${tx.phase === "success" ? "complete" : ""}`}
          >
            {tx.phase === "success" ? (
              <Icon name="check" size={17} />
            ) : ["simulation", "signature", "pending"].includes(tx.phase) ? (
              <span className="spinner" />
            ) : (
              "!"
            )}
          </span>
          <div>
            <strong>{tx.label}</strong>
            <p>
              {phaseLabel[tx.phase]} · {shortAddress(tx.account)}
            </p>
            {tx.message && <p className="error-text">{tx.message}</p>}
          </div>
          {tx.hash && (
            <a
              className="text-link"
              target="_blank"
              rel="noreferrer"
              href={`${explorer}/tx/${tx.hash}`}
            >
              Reçu Etherscan
              <Icon name="external" size={14} />
            </a>
          )}
        </article>
      ))}
    </section>
  );
}

export function WriteHint() {
  const { address } = useWallet();
  return address ? null : (
    <Notice>
      Connecte ton wallet depuis <Link to="/">Mon TD</Link> pour envoyer une
      transaction. Les collections restent consultables.
    </Notice>
  );
}
