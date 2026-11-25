import { useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useTransactions } from "../context/TransactionContext";
import { useProgress } from "../hooks/useProgress";
import { preferredAddress, shortAddress } from "../lib/config";
import { addresses, evaluatorAbi } from "../lib/contracts";
import {
  ContractLink,
  Icon,
  Loading,
  Notice,
  PageTitle,
  Retry,
  WalletControls,
} from "../components/ui";

const steps = [
  {
    title: "Inscrire mon adresse",
    text: "Enregistre le compte utilisé pour tout le TD.",
    path: "/",
    action: "submitExercise",
  },
  {
    title: "Réclamer un FakeBAYC",
    text: "Un premier NFT, puis sa galerie et ses attributs.",
    path: "/fakeBayc",
    action: "ex1_claimedFakeBAYC",
  },
  {
    title: "Acheter un FakeNefturian",
    text: "Envoie le prix demandé en ETH de test.",
    path: "/fakeNefturians",
    action: "ex2_boughtFakeNefturians",
  },
  {
    title: "Réclamer un FakeMeebit",
    text: "Choisis un identifiant disponible et sa signature.",
    path: "/fakeMeebits",
    action: "ex3_claimedFakeMeebits",
  },
] as const;
const manualItems = [
  "Dépôt Git créé et partagé au professeur",
  "Clé RPC Sepolia configurée",
  "Projet frontend initialisé",
  "Connexion navigateur et WalletConnect vérifiées",
  "Changement de réseau et redirection vérifiés",
  "Trois collections, détails et galeries présentés",
  "Cycle des transactions et erreurs présentés",
  "Résolution ENS présentée (adresse avec nom primaire)",
];

export default function Dashboard() {
  const wallet = useWallet();
  const tx = useTransactions();
  const progress = useProgress();
  const [checks, setChecks] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ux721-checklist") || "[]");
    } catch {
      return [];
    }
  });
  function toggle(item: string) {
    const next = checks.includes(item)
      ? checks.filter((value) => value !== item)
      : [...checks, item];
    setChecks(next);
    localStorage.setItem("ux721-checklist", JSON.stringify(next));
  }
  return (
    <>
      <PageTitle
        title="Ton premier parcours NFT."
        description="Connecte ton wallet, explore trois collections et valide ton TD sur Sepolia."
      />
      <section className="onboarding panel">
        <div className="onboarding-copy">
          <h2>
            {wallet.address
              ? "Ton wallet est connecté."
              : "Tout commence avec ton wallet."}
          </h2>
          <p>
            Utilise la même adresse pour chaque exercice. Chaque action est
            confirmée dans ton wallet.
          </p>
          <WalletControls />
          {wallet.address && <p className="address-full">{wallet.address}</p>}
        </div>
        <div className="onboarding-network">
          <span className="network-tag">
            <span className="status-dot" />
            Ethereum Sepolia
          </span>
          <p>ETH de test uniquement</p>
          <Link className="text-link" to="/chain-info">
            Vérifier ma connexion
            <Icon name="arrow" size={16} />
          </Link>
        </div>
      </section>
      {wallet.address && wallet.address !== preferredAddress && (
        <Notice>
          Le compte connecté diffère de ton compte prévu (
          {shortAddress(preferredAddress)}). Sélectionne le bon compte dans ton
          wallet avant l’inscription.
        </Notice>
      )}
      <div className="section-heading">
        <div>
          <h2>Les validations automatiques</h2>
          <p>Quatre étapes, 2 points chacune.</p>
        </div>
        <button className="button small secondary" onClick={progress.reload}>
          <Icon name="refresh" size={16} />
          Actualiser
        </button>
      </div>
      {wallet.address && progress.loading && (
        <Loading label="Lecture de ta progression…" />
      )}
      {progress.error && (
        <Retry error={progress.error} retry={progress.reload} />
      )}
      {progress.data && (
        <div className="progress-summary">
          <strong>{progress.data.automaticPoints} / 8</strong>
          <span>points automatiques validés</span>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Points automatiques"
            aria-valuemin={0}
            aria-valuemax={8}
            aria-valuenow={progress.data.automaticPoints}
          >
            <span
              style={{ width: `${(progress.data.automaticPoints / 8) * 100}%` }}
            />
          </div>
          <span>
            Solde total du TD : <strong>{progress.data.points}</strong> points
          </span>
        </div>
      )}
      <ol className="exercise-list">
        {steps.map((step, index) => {
          const done = Boolean(progress.data?.progress[index]);
          return (
            <li key={step.title}>
              <span className={`step-number ${done ? "done" : ""}`}>
                {done ? <Icon name="check" /> : index + 1}
              </span>
              <div className="exercise-copy">
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <span className={`step-status ${done ? "done" : ""}`}>
                {done ? "Validé · 2 pts" : "2 points"}
              </span>
              {index === 0 ? (
                <button
                  className="button small"
                  disabled={
                    !wallet.address ||
                    tx.busy ||
                    progress.loading ||
                    !progress.data ||
                    progress.data.registered
                  }
                  onClick={() =>
                    void tx.execute({
                      label: "Inscription au TD",
                      address: addresses.evaluator,
                      abi: evaluatorAbi,
                      functionName: "submitExercise",
                    })
                  }
                >
                  {done ? "Inscrit" : "M’inscrire"}
                </button>
              ) : (
                <Link className="button small secondary" to={step.path}>
                  Ouvrir
                  <Icon name="arrow" size={16} />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <ContractLink
        address={addresses.evaluator}
        label="Consulter l’évaluateur du TD"
      />
      <section className="manual-section">
        <div className="section-heading">
          <div>
            <h2>Avant de rendre ton travail</h2>
            <p>
              Repères personnels enregistrés dans ce navigateur. Les points
              manuels sont attribués par le professeur.
            </p>
          </div>
        </div>
        <div className="checklist">
          {manualItems.map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={checks.includes(item)}
                onChange={() => toggle(item)}
              />
              <span>{item}</span>
            </label>
          ))}
        </div>
        <Link className="text-link" to="/configuration">
          Configurer les services et préparer le rendu
          <Icon name="arrow" size={16} />
        </Link>
      </section>
    </>
  );
}
