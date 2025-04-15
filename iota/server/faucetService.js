// faucetService.js - Service for handling faucet requests
const axios = require('axios');
const crypto = require('crypto');
const CONFIG = require('./config');

// Network configuration
const networkConfig = CONFIG.network;

/**
 * Request tokens from a testnet faucet
 * @param {string} address - The wallet address to receive tokens
 * @param {number} amount - Requested amount (may be ignored by faucet)
 * @returns {Promise<object>} - Faucet response
 */
async function requestTokensFromFaucet(address, amount) {
  console.log(`Requesting tokens for address: ${address}`);
  
  // Multiple faucet endpoints to try
  const faucets = [
    { 
      name: 'Shimmer Testnet',
      api: networkConfig.faucetApi 
    },
    { 
      name: 'IOTA Testnet',
      api: 'https://faucet.testnet.iota.org/api/enqueue'
    }
  ];
  
  // Try each faucet until one succeeds
  let lastError = null;
  
  for (const faucet of faucets) {
    try {
      console.log(`Trying ${faucet.name} faucet at ${faucet.api}`);
      
      const response = await axios.post(
        faucet.api,
        { address },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        }
      );
      
      console.log(`${faucet.name} faucet response:`, response.data);
      
      // Return standardized response
      return {
        address,
        amount,
        faucet: faucet.name,
        transaction_id: response.data.id || `faucet-tx-${Date.now()}`,
        status: 'requested',
        message: response.data.message || 'Tokens requested successfully'
      };
    } catch (error) {
      console.error(`Error calling ${faucet.name} faucet:`, error.message);
      lastError = error;
      // Continue to the next faucet
    }
  }
  
  // If all faucets failed, throw an error
  throw new Error(`All faucets failed. Last error: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Generate a deterministic address based on wallet ID (fallback)
 * @param {string} walletId - The wallet identifier
 * @returns {string} - A deterministic address
 */
function generateDeterministicAddress(walletId) {
  const hash = crypto.createHash('sha256').update(walletId).digest('hex');
  return `rms1${hash.substring(0, 56)}`;
}

/**
 * Create a fallback response when faucet request fails
 * @param {string} walletId - The wallet identifier
 * @param {string} address - The wallet address
 * @param {number} amount - The requested amount
 * @param {string} errorMessage - The error message
 * @returns {object} - A fallback response
 */
function createFallbackResponse(walletId, address, amount, errorMessage) {
  const timestamp = Date.now();
  
  return {
    wallet_id: walletId,
    address: address || `offline_fallback_${walletId}`,
    amount,
    transaction_id: `offline_fallback_${timestamp}`,
    block_id: null,
    status: 'offline_fallback',
    message: errorMessage
  };
}

/**
 * Create a successful fallback response when using local simulation
 * @param {string} walletId - The wallet identifier
 * @param {string} address - The wallet address
 * @param {number} amount - The requested amount
 * @returns {object} - A simulated success response
 */
function createLocalSimulationResponse(walletId, address, amount) {
  const timestamp = Date.now();
  
  return {
    wallet_id: walletId,
    address,
    amount,
    transaction_id: `simulated_faucet_${timestamp}`,
    block_id: `simulated_block_${timestamp}`,
    status: 'offline_success',
    message: 'All faucet endpoints are unavailable. Using a local simulation.'
  };
}

module.exports = {
  requestTokensFromFaucet,
  generateDeterministicAddress,
  createFallbackResponse,
  createLocalSimulationResponse
};