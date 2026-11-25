// The TD forbids Web3Modal / AppKit connectors. EthereumProvider is configured
// with showQrModal:false and its display_uri event is rendered by our own QR UI.
// Keep its optional modal module out of the production bundle as well.
export function createAppKit(): never {
  throw new Error(
    "Le TD utilise son propre QR WalletConnect. showQrModal doit rester false.",
  );
}
