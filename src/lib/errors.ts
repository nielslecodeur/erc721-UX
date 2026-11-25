import { BaseError, ContractFunctionRevertedError } from "viem";

export function explainError(error: unknown): string {
  const code = (error as { code?: number })?.code;
  const message = error instanceof Error ? error.message : String(error);
  if (
    code === 4001 ||
    /user rejected|user denied|request rejected/i.test(message)
  )
    return "Demande refusée dans le wallet. Tu peux réessayer quand tu veux.";
  if (code === -32002 || /already pending/i.test(message))
    return "Une demande attend déjà dans ton wallet. Ouvre-le pour la traiter.";
  if (/insufficient funds/i.test(message))
    return "Solde insuffisant : ajoute des ETH de test Sepolia pour le montant et les frais.";
  if (/already submitted/i.test(message))
    return "Cette adresse est déjà inscrite. Actualise ta progression.";
  if (/no submission/i.test(message))
    return "Inscris d’abord ton adresse depuis la page « Mon TD ».";
  if (/already claimed/i.test(message))
    return "Ce NFT a déjà été réclamé. Actualise les identifiants disponibles.";
  if (/signer not whitelisted/i.test(message))
    return "La signature fournie par le TD n’est pas autorisée par ce contrat. Consulte le professeur.";
  if (/no Fake/i.test(message))
    return "Ton wallet doit posséder un NFT de cette collection avant de valider.";
  if (/insufficient payment/i.test(message))
    return "Le prix du NFT a changé. Actualise la collection avant de réessayer.";
  if (/out of bounds/i.test(message))
    return "Cet identifiant n’existe pas dans cette collection.";
  if (
    /timeout|timed out|failed to fetch|http request|network error|fetch failed/i.test(
      message,
    )
  )
    return "Le réseau ne répond pas. Réessaie ou configure ton RPC Alchemy dans .env.local.";
  if (error instanceof BaseError) {
    const reverted = error.walk(
      (cause) => cause instanceof ContractFunctionRevertedError,
    );
    if (reverted instanceof ContractFunctionRevertedError)
      return `Le contrat a refusé l’opération : ${reverted.reason || reverted.data?.errorName || "conditions non remplies"}.`;
    return error.shortMessage;
  }
  return message.length > 240 ? `${message.slice(0, 237)}…` : message;
}
