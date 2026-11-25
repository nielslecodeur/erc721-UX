# UX 721 — ERC721 UX 101

dApp React + TypeScript pour le [TD ERC721 UX 101](https://github.com/Elli610/Blockchain-101/tree/main/workshops/solidity/erc721-ux-101), sur **Ethereum Sepolia uniquement**.

## Démarrer

Prérequis : Node.js 24 et npm. Ce projet utilise une version récente de Vite.

```powershell
npm ci
# .env.local existe déjà dans ce checkout ; sinon :
# Copy-Item .env.example .env.local
npm run dev
```

Ouvrir l’URL indiquée par Vite, généralement http://localhost:5173.

### Configurer .env.local

```dotenv
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/TA_CLE
VITE_MAINNET_RPC_URL=
VITE_WALLETCONNECT_PROJECT_ID=
VITE_STUDENT_ADDRESS=0x4e7f5303BdE72312BF53E7Bc0B51dC216ACB1621
```

- **Alchemy** : choisir Ethereum **Sepolia**, copier l’URL HTTPS RPC complète. Sans valeur, les lectures utilisent un RPC public. Pour les points manuels « clé RPC », configure ta propre clé.
- **WalletConnect** : créer un Project ID sur [Reown](https://dashboard.reown.com), renseigner `VITE_WALLETCONNECT_PROJECT_ID` et autoriser l’origine utilisée (`http://localhost:5173`, par exemple). Ce n’est pas ta clé Alchemy. Sans cet identifiant, MetaMask fonctionne mais la connexion mobile QR est indisponible.
- **ENS** : les noms primaires sont résolus sur Ethereum **mainnet**, avec vérification que le nom résout bien vers l’adresse. Un RPC public est prévu ; un RPC Alchemy mainnet facultatif améliore sa disponibilité. L’absence de nom ou une erreur RPC laisse l’adresse hexadécimale visible.
- Redémarrer Vite après toute modification de l’environnement.

Les variables `VITE_` sont publiques dans le JavaScript du navigateur. Restreindre les domaines et quotas dans Alchemy/Reown. Ne jamais mettre de clé privée ou de phrase de récupération dans ce projet. `.env.local` est ignoré par Git.

## Faire le TD

1. Ouvrir **Mon TD**, connecter le compte souhaité avec le wallet navigateur ou WalletConnect.
2. Vérifier le réseau dans **Connexion au réseau**. Si le wallet utilise un autre réseau, la dApp redirige vers `/wrong-network`. Le bouton de changement demande l’ajout de Sepolia si nécessaire.
3. Prévoir assez d’ETH de test Sepolia pour les frais et l’achat du FakeNefturian. Aucune transaction Ethereum mainnet n’est envoyée.
4. Cliquer **M’inscrire**, puis confirmer `submitExercise()` dans le wallet.
5. Dans **FakeBAYC**, cliquer **Réclamer un NFT**, attendre le reçu confirmé, puis **Valider · 2 points**.
6. Dans **FakeNefturians**, vérifier le prix lu depuis le contrat, acheter, attendre le reçu, puis valider.
7. Dans **FakeMeebits**, choisir un identifiant disponible. Sa signature correspondante est sélectionnée depuis le fichier du TD. Réclamer, puis valider.
8. Vérifier **Mon TD** : quatre validations automatiques de deux points chacune, soit **8 points automatiques**. Le solde ERC20 total peut aussi inclure des points attribués manuellement par le professeur.

Chaque action ouvre sa propre demande dans le wallet. Un mint et sa validation sont deux transactions distinctes. La dApp simule l’appel avant l’envoi, vérifie le compte et le réseau, attend le reçu et contrôle son statut. Un reçu échoué, une annulation ou un remplacement par une autre transaction ne sont pas présentés comme une réussite. En cas de délai de confirmation dépassé, vérifier le lien Etherscan avant de réessayer.

L’accueil se limite à la connexion et à la progression. Les validations des collections y sont accessibles directement lorsqu’un NFT est détenu. La checklist locale a été retirée pour alléger l’interface ; les consignes de rendu restent dans Configuration. Les tests utilisent un wallet et des RPC simulés ; ils ne signent aucune transaction réelle.

Avant l’achat d’un FakeNefturian, le prix est relu depuis le contrat. Avant un claim Meebits, la signature sélectionnée est récupérée cryptographiquement puis son signataire est vérifié dans `whitelist`. Une signature non autorisée désactive le mint avec un message explicite.

## Couverture des exigences

| Exigence du TD                    | Implémentation / route                                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dépôt Git, clé RPC et frontend    | Dépôt `nielslecodeur/erc721-UX` ; React/Vite ; `.env.example`. Partager le lien au professeur.                                                        |
| Inscription `submitExercise()`    | `/` — inscription, progression et solde ERC20 réels                                                                                                   |
| Wallet navigateur sans connecteur | `src/context/WalletContext.tsx` — `window.ethereum`, `eth_requestAccounts`, `accountsChanged`, `chainChanged`, déconnexion et restauration sans popup |
| WalletConnect v2 direct           | `EthereumProvider.init`, `showQrModal:false`, événement `display_uri`, QR généré avec `qrcode`, annulation de connexion                               |
| Changer / ajouter Sepolia         | `wallet_switchEthereumChain`, repli `wallet_addEthereumChain` sur erreur 4902                                                                         |
| Chain ID, dernier bloc et adresse | `/chain-info` — dernier bloc actualisé toutes les 15 secondes                                                                                         |
| Erreur et redirection réseau      | `/wrong-network`, retour à la route initiale après changement                                                                                         |
| Nom et nombre de FakeBAYC         | `/fakeBayc` — `name()` et `totalSupply()`                                                                                                             |
| Mint gratuit et validation        | `claimAToken()`, puis `ex1_claimedFakeBAYC()`                                                                                                         |
| Image et attributs FakeBAYC       | `/fakeBayc/:tokenId` ; aucun champ `name`/`description` requis                                                                                        |
| NFT inexistant                    | `ownerOf()` vérifié avant les métadonnées ; message distinct d’une panne réseau                                                                       |
| Galerie propriétaire BAYC         | `/fakeBayc/gallery/:address` — `balanceOf` puis `tokenOfOwnerByIndex`, pagination de 12 NFT, images `loading="lazy"`                                  |
| Prix et achat payable             | `/fakeNefturians` — `tokenPrice()`, valeur en wei transmise à `buyAToken()`                                                                           |
| Validation achat                  | `ex2_boughtFakeNefturians()`                                                                                                                          |
| Identifiants Nefturians détenus   | `/fakeNefturians/:address`, même énumération paginée                                                                                                  |
| Meebits non réclamés              | `/fakeMeebits` — `maxTokenId` et `tokensThatWereClaimed`, parmi les signatures disponibles dans le fichier fourni                                     |
| Mint avec signature               | Identifiant et signature correspondante de `src/data/signatures.json`, appel `claimAToken(tokenId, signature)` sans pourboire                         |
| Validation Meebits                | `ex3_claimedFakeMeebits()`                                                                                                                            |
| Cycle et erreurs des transactions | `src/context/TransactionContext.tsx` et historique avec liens Etherscan                                                                               |
| ENS inversé                       | Résolution mainnet du compte, vérification forward, nom affiché dans l’en-tête                                                                        |
| Bonus inclus                      | Thème sombre, responsive, cache mémoire des métadonnées, passerelles IPFS et délais bornés                                                            |

Tous les NFT du propriétaire sont accessibles par pagination. Les images et métadonnées dépendent des serveurs externes des collections ; leur indisponibilité ne signifie pas que le NFT n’existe pas. Les lectures en erreur n’affichent pas de progression fictive.

## Adresses et sources

Adresses issues du README du TD, copiées dans `src/lib/contracts.ts` avec les ABI correspondant aux sources Solidity.

| Contrat        | Adresse Sepolia                              |
| -------------- | -------------------------------------------- |
| Points         | `0x996BA4faE3a3c2d07aC780401B07E103553eAB92` |
| Evaluator      | `0xe446502701fA5808DB07D817B00B660fB5EA6bFB` |
| FakeBAYC       | `0x262fc337408995376b35f950e98b7fB60CF691f5` |
| FakeNefturians | `0x4F4f92733eEEe8405764EaA6D2B7304B59642469` |
| FakeMeebits    | `0x589d269675BE36E4cFc3a4e04c9E5dad2ef2C4d6` |
| Claimer        | `0xA45C08F929dfEf9a2B3E9eB3A5f9728F594f215a` |

Copies de référence récupérées le 17 novembre 2026 dans `reference/WORKSHOP.md` et `reference/contracts/`. Les contrats du TD sont sous licence MIT indiquée dans leurs en-têtes. Les signatures publiques sont copiées sans modification depuis [output-sig.json](https://github.com/Elli610/Blockchain-101/blob/main/workshops/solidity/erc721-ux-101/signatures/output-sig.json).

## Vérifier le projet

```powershell
npm run build
npm test
npm run verify:chain
```

- **Build** : vérification TypeScript et bundle de production.
- **Tests** : Playwright lance un serveur temporaire sur `127.0.0.1:5174`. Microsoft Edge est utilisé sous Windows et Chromium sur les autres systèmes. Installer Chromium avec `npx playwright install chromium` si nécessaire. Couverture : connexion, changement/ajout réseau, événements wallet, inscription, validation depuis l’accueil, prix payable relu avant l’achat, refus de signature, reçu échoué, détails, NFT absent, galeries paginées et autorisation des signatures Meebits. Aucun compte réel n’est utilisé.
- **Vérification chaîne** : lecture seule du réseau, code des six contrats, nom/quantité/prix, inscription et solde du compte, collection liée au claimer et autorisation de la première signature. Ce script n’envoie aucune transaction et ne nécessite pas de clé privée.

### Dépendances WalletConnect

La dApp n’utilise ni wagmi, RainbowKit, Web3Modal ni connecteur AppKit. La version actuelle d’`@walletconnect/ethereum-provider` installe toutefois AppKit comme dépendance transitive pour sa fenêtre QR optionnelle. L’alias de `vite.config.ts` remplace **uniquement ce module de fenêtre** par une garde locale : il ne fait pas partie du bundle livré. La connexion est gérée directement par le provider et notre propre QR.

`npm audit` signale actuellement une alerte Zod dans cette branche optionnelle transitive. Ne pas appliquer `npm audit fix --force` aveuglément : cela rétrograde le provider. Vérifier une mise à jour compatible de l’amont ; aucune validation Zod/AppKit n’est exécutée par notre parcours.

## Rendre le TD

Partager le dépôt https://github.com/nielslecodeur/erc721-UX au professeur. Pour poursuivre le travail depuis un clone, renseigner `.env.local` puis utiliser les commandes de démarrage du README principal.

Pour déployer sur un hébergeur statique : `npm run build`, publier `dist`, et configurer la réécriture de toutes les routes vers `index.html` pour React Router. Ne pas utiliser `vite preview` comme serveur de production.
