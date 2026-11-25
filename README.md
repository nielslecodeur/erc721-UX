# TD ERC721 UX 101

dApp du [TD ERC721 UX 101](https://github.com/Elli610/Blockchain-101/tree/main/workshops/solidity/erc721-ux-101) : lecture et ecriture de contrats ERC721 deployes sur **Ethereum Sepolia**.

Stack : **React + TypeScript + Vite + viem**. Connexion wallet geree directement avec `window.ethereum` et `@walletconnect/ethereum-provider`, sans wagmi, RainbowKit ou Web3Modal. Interface en francais, responsive et themes clair/sombre.

## Lancer

Prerequis : Node.js 24 et npm.

```bash
git clone https://github.com/nielslecodeur/erc721-UX.git
cd erc721-UX
npm ci
cp .env.example .env.local
npm run dev
```

Sous PowerShell, remplacer `cp .env.example .env.local` par `Copy-Item .env.example .env.local`. Si le fichier existe deja, conserver ses valeurs.

Ouvrir l'adresse affichee par Vite, generalement **http://localhost:5173**.

## Configuration

Dans `.env.local` :

| Variable                        | Utilisation                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SEPOLIA_RPC_URL`          | URL HTTPS RPC Alchemy Ethereum Sepolia. Un RPC public est utilise si le champ est vide.                                                  |
| `VITE_MAINNET_RPC_URL`          | RPC Ethereum mainnet pour l'ENS, facultatif. Aucun transfert mainnet n'est effectue.                                                     |
| `VITE_WALLETCONNECT_PROJECT_ID` | Project ID [Reown](https://dashboard.reown.com) pour la connexion mobile par QR. Autoriser l'origine de l'application dans le dashboard. |
| `VITE_STUDENT_ADDRESS`          | Adresse du compte prevu pour le TD, facultative. Ne donne aucun droit de signature.                                                      |

Redemarrer Vite apres modification. `.env.local` reste hors de Git ; les variables `VITE_` sont publiques dans le frontend. Ne jamais y mettre une cle privee ou une phrase de recuperation.

## Pages

| Route                        | Contenu                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `/`                          | Connexion wallet, progression et points du TD, inscription `submitExercise()`     |
| `/chain-info`                | Chain ID, dernier bloc Sepolia, compte connecte et solde ETH de test              |
| `/wrong-network`             | Erreur hors Sepolia, changement de reseau et ajout si necessaire                  |
| `/fakeBayc`                  | Nom, nombre de NFT crees, claim gratuit, validation ex1                           |
| `/fakeBayc/:tokenId`         | Image et attributs des metadonnees ; erreur si le NFT n'existe pas                |
| `/fakeBayc/gallery/:address` | NFT d'un proprietaire, pagination et images chargees paresseusement               |
| `/fakeNefturians`            | Prix lu sur le contrat, achat payable, validation ex2                             |
| `/fakeNefturians/:address`   | Identifiants des NFT detenus par une adresse                                      |
| `/fakeMeebits`               | Identifiants disponibles, signature correspondante du TD, claim et validation ex3 |
| `/configuration`             | Configuration des services et preparation du rendu                                |

## Ou est quoi

- `src/context/WalletContext.tsx` : `eth_requestAccounts`, evenements `accountsChanged`/`chainChanged`, connexion WalletConnect directe, ENS verifie et changement/ajout de Sepolia.
- `src/context/TransactionContext.tsx` : simulation, controle compte/reseau, signature, confirmation, remplacement et erreurs des transactions.
- `src/components/ui.tsx` : QR WalletConnect maison, images NFT avec repli et historique avec liens Etherscan.
- `src/pages/` : parcours du TD, trois collections, details, galeries et informations reseau.
- `src/lib/contracts.ts` : adresses Sepolia et ABI des contrats du TD.
- `src/lib/metadata.ts` : cache des metadonnees, resolution IPFS et passerelles avec delai maximum.
- `src/data/signatures.json` : signatures publiques fournies par le TD pour FakeMeebits.
- `tests/` : tests navigateur avec wallet et RPC simules, sans transactions reelles.
- `reference/` : README et sources Solidity du TD utilises comme reference.

## Valider le TD

Utiliser le meme wallet sur Sepolia pour tout le TD. S'inscrire sur `/`, puis pour chaque collection effectuer le mint ou l'achat, attendre sa confirmation et cliquer **Valider**. Le prix d'achat et les frais se paient en ETH de test Sepolia.

Les quatre validations automatiques valent **8 points** au total. Les autres points sont attribues par le professeur apres examen du depot.

L'accueil regroupe la connexion et les validations : si le wallet detient deja le NFT et est inscrit, la validation est directement disponible depuis la progression. Le menu en haut donne acces aux collections et a la configuration.

Le prix des FakeNefturians est relu juste avant la simulation d'achat. Pour FakeMeebits, la signature selectionnee est verifiee contre la liste des signataires autorises ; un mint non autorise est bloque avant l'ouverture du wallet.

## Verification

```bash
npm run build
npm test
npm run verify:chain
```

Les tests utilisent Microsoft Edge sous Windows, Chromium sur les autres systemes. Pour Linux/macOS, installer le navigateur une fois avec `npx playwright install chromium`. La verification GitHub Actions compile le projet et execute les tests sur Chromium avec des RPC simules.

`verify:chain` est une lecture seule des contrats Sepolia et necessite un RPC accessible. Aucune cle privee n'est utilisee.

Le [guide detaille](docs/GUIDE.md) contient la matrice de couverture du TD, les adresses des contrats, les limites des services externes et les explications de deploiement.
