import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { WalletProvider, useWallet } from "./context/WalletContext";
import { TransactionProvider } from "./context/TransactionContext";
import {
  configuredRpc,
  preferredAddress,
  sepolia,
  walletConnectId,
} from "./lib/config";
import {
  Icon,
  Notice,
  PageTitle,
  PairingPanel,
  TransactionFeed,
  WalletControls,
} from "./components/ui";
import Dashboard from "./pages/Dashboard";
import { ChainInfo, WrongNetwork } from "./pages/Network";
import { Collection, Gallery, Meebits, TokenDetail } from "./pages/Collections";
import "./App.css";

const navigation = [
  { path: "/", label: "Mon TD", icon: "grid" as const },
  {
    path: "/chain-info",
    label: "Connexion au réseau",
    icon: "network" as const,
  },
  { path: "/fakeBayc", label: "FakeBAYC", number: "1" },
  { path: "/fakeNefturians", label: "FakeNefturians", number: "2" },
  { path: "/fakeMeebits", label: "FakeMeebits", number: "3" },
  { path: "/configuration", label: "Configuration", icon: "settings" as const },
];

function Shell() {
  const wallet = useWallet();
  const location = useLocation();
  const [dark, setDark] = useState(
    () => localStorage.getItem("ux721-theme") === "dark",
  );
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("ux721-theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    const title =
      navigation.find(
        (item) =>
          item.path === location.pathname ||
          (item.path !== "/" && location.pathname.startsWith(item.path)),
      )?.label || "NFT";
    document.title = `${title} · UX 721`;
    window.scrollTo(0, 0);
  }, [location.pathname]);
  const wrongNetwork =
    wallet.address &&
    wallet.chainId !== undefined &&
    wallet.chainId !== sepolia.id &&
    location.pathname !== "/wrong-network";
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="UX 721, accueil">
          <span className="brand-mark">721</span>
          <span>
            UX <strong>721</strong>
            <small>Le laboratoire NFT</small>
          </span>
        </Link>
        <nav aria-label="Navigation du TD">
          {navigation.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === "/"}>
              {"icon" in item && item.icon ? (
                <Icon name={item.icon} size={19} />
              ) : (
                <span className="nav-number">{item.number}</span>
              )}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span>Blockchain 101</span>
          <a
            href="https://github.com/Elli610/Blockchain-101/tree/main/workshops/solidity/erc721-ux-101"
            target="_blank"
            rel="noreferrer"
          >
            Consignes du TD
            <Icon name="external" size={14} />
          </a>
          <button
            className="theme-toggle"
            onClick={() => setDark((value) => !value)}
            aria-label={
              dark ? "Activer le thème clair" : "Activer le thème sombre"
            }
          >
            <Icon name={dark ? "sun" : "moon"} size={18} />
            {dark ? "Thème clair" : "Thème sombre"}
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            ERC721 UX 101<span>/ Atelier pratique</span>
          </div>
          <div className="topbar-actions">
            <span
              className={`network-tag ${wallet.address && wallet.chainId !== sepolia.id ? "wrong" : ""}`}
            >
              <span className="status-dot" />
              {wallet.address && wallet.chainId !== sepolia.id
                ? `Réseau ${wallet.chainId ?? "…"}`
                : "Sepolia"}
            </span>
            <WalletControls compact />
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {wallet.error && <Notice tone="error">{wallet.error}</Notice>}
          <PairingPanel />
          {wrongNetwork ? (
            <Navigate
              to="/wrong-network"
              replace
              state={{ from: location.pathname }}
            />
          ) : (
            <Outlet />
          )}
          <TransactionFeed />
        </main>
        <footer className="main-footer">
          <span>Fait pour apprendre. Sur Sepolia.</span>
          <a
            href="https://sepolia.etherscan.io"
            target="_blank"
            rel="noreferrer"
          >
            Explorateur Sepolia
            <Icon name="external" size={13} />
          </a>
        </footer>
      </div>
    </div>
  );
}

function Configuration() {
  return (
    <>
      <PageTitle
        title="Prêt pour la suite."
        description="Les services à configurer et les derniers éléments à préparer avant de rendre ton TD."
      />
      <section className="panel">
        <h2>Configurer les services</h2>
        <p>
          Ouvre <code>.env.local</code> à la racine du projet, remplis les
          valeurs ci-dessous, puis redémarre <code>npm run dev</code>.
        </p>
        <dl className="data-list">
          <div>
            <dt>RPC Alchemy Sepolia</dt>
            <dd>
              {configuredRpc
                ? "URL configurée"
                : "RPC public utilisé par défaut"}
            </dd>
          </div>
          <div>
            <dt>WalletConnect / Reown</dt>
            <dd>
              {walletConnectId
                ? "Project ID renseigné"
                : "Project ID à renseigner pour le QR mobile"}
            </dd>
          </div>
          <div>
            <dt>Compte prévu pour le TD</dt>
            <dd className="address-full">{preferredAddress}</dd>
          </div>
        </dl>
        <pre>
          <code>{`VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TA_CLE
VITE_MAINNET_RPC_URL=
VITE_WALLETCONNECT_PROJECT_ID=TON_PROJECT_ID`}</code>
        </pre>
        <p>
          Une clé RPC Ethereum mainnet est facultative pour l’ENS ; un RPC
          public est déjà configuré.
        </p>
        <div className="contract-links">
          <a
            className="text-link"
            href="https://dashboard.alchemy.com"
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir Alchemy
            <Icon name="external" size={14} />
          </a>
          <a
            className="text-link"
            href="https://dashboard.reown.com"
            target="_blank"
            rel="noreferrer"
          >
            Créer mon Project ID Reown
            <Icon name="external" size={14} />
          </a>
        </div>
        <Notice>
          Dans Reown, autorise l’origine de ton application (par exemple
          http://localhost:5173). Les identifiants du frontend sont publics :
          limite leur utilisation par domaine dans les dashboards.
        </Notice>
      </section>
      <section className="manual-section">
        <h2>Ton rendu au professeur</h2>
        <ol className="handoff-list">
          <li>
            Crée un dépôt Git pour ce frontend et partage le lien au professeur.
          </li>
          <li>
            Remplis ta clé Alchemy dans <code>.env.local</code>, vérifie la
            connexion et le changement de réseau.
          </li>
          <li>
            Inscris ton wallet, réalise les trois mints et valide chaque
            collection.
          </li>
          <li>
            Montre les routes du TD, la galerie, les attributs, un NFT
            inexistant et les états de transaction.
          </li>
          <li>
            Utilise le README du projet : il contient le tableau des exigences
            et les instructions de lancement.
          </li>
        </ol>
        <p className="muted">
          Le frontend ne peut pas attribuer les points manuels. Le solde affiché
          sur « Mon TD » est lu sur le contrat ERC20 du TD.
        </p>
      </section>
    </>
  );
}

function NotFound() {
  return (
    <>
      <PageTitle
        title="Cette page n’existe pas."
        description="Retrouve le parcours du TD ou ouvre une collection depuis le menu."
      />
      <Link className="button" to="/">
        Retour à mon TD
      </Link>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WalletProvider>
        <TransactionProvider>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Dashboard />} />
              <Route path="chain-info" element={<ChainInfo />} />
              <Route path="wrong-network" element={<WrongNetwork />} />
              <Route path="fakeBayc" element={<Collection kind="bayc" />} />
              <Route
                path="fakeBayc/gallery/:address"
                element={<Gallery kind="bayc" />}
              />
              <Route path="fakeBayc/:tokenId" element={<TokenDetail />} />
              <Route
                path="fakeNefturians"
                element={<Collection kind="nefturians" />}
              />
              <Route
                path="fakeNefturians/:address"
                element={<Gallery kind="nefturians" />}
              />
              <Route path="fakeMeebits" element={<Meebits />} />
              <Route path="configuration" element={<Configuration />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </TransactionProvider>
      </WalletProvider>
    </BrowserRouter>
  );
}
