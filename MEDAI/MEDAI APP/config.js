// Configuration for the IOTA Blockchain Registry App

export const CONFIG = {
  // API URL - change this to your server's address
  API_URL: "http://192.168.71.82:3000/api",
  
  // IOTA Nodes (for direct access - currently using server as middleware)
  NODES: [
    "https://api.testnet.shimmer.network",
    "https://api.testnet.iota.org",
    "https://api.shimmer.network"
  ],
  
  // Tags for identifying our data on the tangle
  ORGAN_TAG: "ORGAN_DONOR_REGISTRY",
  MEDICINE_TAG: "MEDICINE_AUTH_REGISTRY",
  
  // Version information
  VERSION: "1.0.0",
  
  // Feature flags
  FEATURES: {
    DIRECT_IOTA_ACCESS: false,  // If true, bypass server and talk directly to IOTA
    ENABLE_OFFLINE_MODE: true,  // Enable offline caching
    DEBUG_MODE: __DEV__  // Enable debug logs in development
  }
};