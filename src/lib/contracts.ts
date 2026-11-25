import { getAddress, parseAbi } from "viem";

// Sources: reference/contracts. Addresses: upstream workshop README, Ethereum Sepolia.
export const addresses = {
  points: getAddress("0x996BA4faE3a3c2d07aC780401B07E103553eAB92"),
  evaluator: getAddress("0xe446502701fA5808DB07D817B00B660fB5EA6bFB"),
  bayc: getAddress("0x262fc337408995376b35f950e98b7fB60CF691f5"),
  nefturians: getAddress("0x4F4f92733eEEe8405764EaA6D2B7304B59642469"),
  meebits: getAddress("0x589d269675BE36E4cFc3a4e04c9E5dad2ef2C4d6"),
  claimer: getAddress("0xA45C08F929dfEf9a2B3E9eB3A5f9728F594f215a"),
};
export const nftAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function tokenCounter() view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function claimAToken()",
  "function tokenPrice() view returns (uint256)",
  "function buyAToken() payable",
]);
export const evaluatorAbi = parseAbi([
  "function hasSubmitted(address student) view returns (bool)",
  "function exerciseProgression(address student, uint256 exercise) view returns (bool)",
  "function submitExercise()",
  "function ex1_claimedFakeBAYC()",
  "function ex2_boughtFakeNefturians()",
  "function ex3_claimedFakeMeebits()",
]);
export const pointsAbi = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);
export const claimerAbi = parseAbi([
  "function maxTokenId() view returns (uint256)",
  "function tokensThatWereClaimed(uint256 tokenId) view returns (bool)",
  "function whitelist(address signer) view returns (bool)",
  "function fakeMeebits() view returns (address)",
  "function claimAToken(uint256 tokenId, bytes signature) payable",
]);
