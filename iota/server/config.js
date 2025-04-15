// config.js - Application configuration
require('dotenv').config();

// Common configuration for server and client
const CONFIG = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  wallet: {
    strongholdPassword: process.env.STRONGHOLD_PASSWORD || 'your_secure_password',
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key',
    dbPath: process.env.WALLET_DB_PATH || './wallet_database',
    strongholdPath: process.env.STRONGHOLD_PATH || './wallet_stronghold',
    dataPath: process.env.DATA_PATH || './data',
  },
  network: {
    // Parse node URLs from environment or use defaults
    nodes: process.env.NODE_URLS 
      ? process.env.NODE_URLS.split(',')
      : ['https://api.testnet.shimmer.network', 'https://api.testnet.iota.org'],
    faucetApi: process.env.FAUCET_API || 'https://faucet.testnet.shimmer.network/api/enqueue',
    faucetWebsite: 'https://faucet.testnet.shimmer.network',
    explorer: 'https://explorer.shimmer.network/testnet',
    networkId: process.env.NETWORK || 'testnet',
    coinType: parseInt(process.env.COIN_TYPE || '4219', 10), // 4219 for Shimmer, 4218 for IOTA
  },
  api: {
    baseUrl: process.env.API_URL || 'http://localhost:3000/api',
    timeout: 30000, // 30 seconds default timeout
  },
  // Fixed IDs for simplified development
  fixed: {
    userId: 'fixed_user_123',
    walletId: 'fixed_wallet_123',
  }
};

module.exports = CONFIG;