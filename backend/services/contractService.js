// services/contractService.js
let smartGuardContract = null;
let publicClient = null;
let walletClient = null;
let alchemyInstance = null;

export function setContracts(contract, pClient, wClient, alchemy) {
  smartGuardContract = contract;
  publicClient = pClient;
  walletClient = wClient;
  alchemyInstance = alchemy;
  console.log('✅ Contract service initialized with all clients');
}

export function getSmartGuardContract() {
  return smartGuardContract;
}

export function getPublicClient() {
  return publicClient;
}

export function getWalletClient() {
  return walletClient;
}

export function getAlchemy() {
  return alchemyInstance;
}

export function isContractInitialized() {
  return smartGuardContract !== null;
}

export function logContractStatus() {
  console.log('📊 Contract Service Status:', {
    contractInitialized: !!smartGuardContract,
    publicClient: !!publicClient,
    walletClient: !!walletClient,
    alchemy: !!alchemyInstance
  });
}