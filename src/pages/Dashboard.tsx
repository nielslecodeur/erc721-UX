import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useTransactions } from "../context/TransactionContext";
import { useProgress } from "../hooks/useProgress";
import { preferredAddress, shortAddress } from "../lib/config";
import { addresses, evaluatorAbi } from "../lib/contracts";
import {
  ContractLink,
  Loading,
  Notice,
  PageTitle,
  Retry,
  WalletControls,
} from "../components/ui";

const steps = [
  {
    title: "Inscription",
    text: "Enregistre ton adresse auprès de l’évaluateur.",
    path: "/",
    action: "submitExercise",
  },
  {
    title: "FakeBAYC",
    text: "Réclame un NFT gratuit, puis valide sa possession.",
    path: "/fakeBayc",
    action: "ex1_claimedFakeBAYC",
  },
  {
    title: "FakeNefturians",
    text: "Achète un NFT avec des ETH de test, puis valide.",
    path: "/fakeNefturians",
    action: "ex2_boughtFakeNefturians",
  },
  {
    title: "FakeMeebits",
    text: "Réclame un NFT avec sa signature, puis valide.",
    path: "/fakeMeebits",
    action: "ex3_claimedFakeMeebits",
  },
] as const;

export default function Dashboard() {
  const wallet = useWallet();
  const tx = useTransactions();
  const progress = useProgress();

  return (
    <>
      <PageTitle
        title="ERC721 UX 101"
        description="Connecte ton wallet sur Sepolia, récupère les NFT et valide les exercices."
      />
      <section className="onboarding panel">
        <h2>
          {wallet.address ? "Ton wallet est connecté." : "Connexion au wallet"}
        </h2>
        <WalletControls />
        {wallet.address && <p className="address-full">{wallet.address}</p>}
        <p className="muted">
          Garde la même adresse pour tout le TD.{" "}
          <Link to="/chain-info">Vérifier le réseau et le solde ETH</Link>
        </p>
      </section>
      {wallet.address && wallet.address !== preferredAddress && (
        <Notice>
          Le compte connecté diffère du compte prévu (
          {shortAddress(preferredAddress)}). Vérifie ton compte avant
          l’inscription.
        </Notice>
      )}
      <section aria-labelledby="progress-heading">
        <div className="section-heading">
          <h2 id="progress-heading">Progression</h2>
          <button
            className="button small secondary"
            onClick={progress.reload}
            disabled={progress.loading}
          >
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
          <p className="progress-summary">
            <strong>{progress.data.automaticPoints} / 8</strong> points
            automatiques · Solde total du TD :{" "}
            <strong>{progress.data.points}</strong> points
          </p>
        )}
        <ol className="exercise-list">
          {steps.map((step, index) => {
            const done = Boolean(progress.data?.progress[index]);
            const canValidate = Boolean(
              progress.data &&
              (index === 0 ||
                (progress.data.registered &&
                  progress.data.balances[index - 1] > 0n)),
            );
            return (
              <li key={step.title}>
                <div className="exercise-copy">
                  <h3>
                    {index === 0 ? (
                      step.title
                    ) : (
                      <Link to={step.path}>{step.title}</Link>
                    )}
                  </h3>
                  <p>{step.text}</p>
                </div>
                <span className={`step-status ${done ? "done" : ""}`}>
                  {done ? "Validé · 2 pts" : "2 points"}
                </span>
                {index > 0 && !done && !canValidate ? (
                  <Link className="button small secondary" to={step.path}>
                    Ouvrir la collection
                  </Link>
                ) : (
                  <button
                    className="button small"
                    disabled={
                      !wallet.address ||
                      tx.busy ||
                      progress.loading ||
                      !canValidate ||
                      done
                    }
                    onClick={() =>
                      void tx.execute({
                        label:
                          index === 0
                            ? "Inscription au TD"
                            : `Valider ${step.title}`,
                        address: addresses.evaluator,
                        abi: evaluatorAbi,
                        functionName: step.action,
                      })
                    }
                  >
                    {done
                      ? index === 0
                        ? "Inscrit"
                        : "Validé"
                      : index === 0
                        ? "M’inscrire"
                        : "Valider · 2 points"}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        <p className="muted">
          Les validations vérifient les NFT déjà présents dans ton wallet. Les
          points manuels sont attribués par le professeur.
        </p>
        <ContractLink
          address={addresses.evaluator}
          label="Consulter l’évaluateur du TD"
        />
      </section>
    </>
  );
}
