// walletService.js - Core wallet service using @iota/wallet with manager
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const bip39 = require('bip39');
const { AccountManager, CoinType } = require('@iota/wallet');

// Import wallet manager
const walletManager = require('./walletManager');
const WALLET_DB_PATH = './wallet_database';
const LOCK_FILES_DIR = WALLET_DB_PATH;
const LOCK_FILE_PATH = path.join(WALLET_DB_PATH, 'LOCK');
// Configuration constants
const STRONGHOLD_PATH = './wallet_stronghold';
const PASSWORD = process.env.STRONGHOLD_PASSWORD || 'your_secure_password';

// Network configuration from wallet manager
const networkConfig = {
  nodes: [
    'https://api.testnet.iotaledger.net'
  ],
  primaryNode: 'https://api.testnet.iotaledger.net',
  faucetApi: 'https://faucet.testnet.iotaledger.net/api/enqueue',
  explorerUrl: 'https://explorer.iota.org/iota-testnet',
  networkId: 'testnet'
};

const { 
  TOKEN_SYMBOL, 
  baseToDisplay, 
  displayToBase, 
  formatTokenAmount 
} = require('./tokenUtils');

// In-memory cache for wallet metadata
let walletCache = {};

/**
 * Create a new wallet with a generated mnemonic
 * @param {string} userId - The user identifier
 * @param {string} walletId - The wallet identifier
 * @returns {Promise<object>} - New wallet information
 */
async function createWallet(userId, walletId) {
  console.log(`Creating wallet with ID: ${walletId} for user: ${userId}`);
  
  try {
    // Create stronghold path for this wallet
    const strongholdPath = path.join(STRONGHOLD_PATH, `${walletId}.stronghold`);
    console.log(`Stronghold path: ${strongholdPath}`);
    
    // Check if file already exists, remove it if it does
    try {
      await fs.access(strongholdPath);
      await fs.unlink(strongholdPath);
      console.log(`Removed existing stronghold file for wallet: ${walletId}`);
    } catch (error) {
      console.log(`No existing stronghold file found (this is normal): ${error.message}`);
    }
    
    // Use wallet manager to perform operations
    return walletManager.executeOperation(walletId, async (manager) => {
      let mnemonic = null;
      let account = null;
      let addresses = null;
      
      try {
        // Generate mnemonic - Use bip39 directly to avoid issues
        console.log('Generating mnemonic...');
        mnemonic = bip39.generateMnemonic(256); // 24 words
        
        console.log('Mnemonic type:', typeof mnemonic);
        console.log('Mnemonic length:', mnemonic ? mnemonic.length : 'undefined');
        
        if (typeof mnemonic !== 'string') {
          console.error('ERROR: Mnemonic is not a string!');
          mnemonic = bip39.generateMnemonic(256);
          console.log('Generated fallback mnemonic with bip39 directly');
        }
        
        // Verify mnemonic is a valid string
        if (typeof mnemonic === 'string' && mnemonic.length > 0) {
          console.log('Mnemonic generated successfully! First 5 words:', mnemonic.split(' ').slice(0, 5).join(' ') + '...');
        } else {
          throw new Error(`Invalid mnemonic: ${typeof mnemonic}`);
        }
        
        // Store mnemonic
        console.log('Storing mnemonic...');
        await manager.storeMnemonic(mnemonic);
        console.log('Mnemonic stored successfully!');
        
        // Create account
        console.log('Creating account...');
        console.log('Account alias:', walletId);
        account = await manager.createAccount({
          alias: walletId
        });
        console.log('Account created successfully:', account ? 'Account object exists' : 'Account is null');
        
        // Attempt to extract address
        let address = 'address_generation_not_attempted';
        
        try {
          // Generate address
          console.log('Syncing account before address generation...');
          try {
            await account.sync();
            console.log('Sync completed!');
          } catch (syncError) {
            console.error('Error syncing account, continuing anyway:', syncError);
          }
          
          console.log('Getting addresses...');
          addresses = await account.addresses();
          console.log('Addresses retrieved:', addresses ? `Found ${addresses.length} addresses` : 'Addresses is null');
          
          if (!addresses || addresses.length === 0) {
            // Generate new address if none exists
            console.log('No addresses found, generating new address...');
            const newAddresses = await account.generateAddresses(1);
            console.log('New addresses generated:', newAddresses ? `Generated ${newAddresses.length} addresses` : 'New addresses is null');
            
            if (!newAddresses || newAddresses.length === 0) {
              throw new Error('Failed to generate address - newAddresses is empty');
            }
            
            address = newAddresses[0].address;
            console.log('Using newly generated address:', address);
          } else {
            address = addresses[0].address;
            console.log('Using existing address:', address);
          }
        } catch (addrError) {
          console.error('Error handling addresses:', addrError);
          address = generateDeterministicAddress(walletId);
          console.log('Using fallback deterministic address after error:', address);
        }
        
        console.log(`Final address to use: ${address}`);
        
        // Create wallet metadata
        const walletMeta = {
          id: walletId,
          userId,
          address,
          balance: 0,
          mnemonic, // In a real app, you would securely store this
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        
        // Store in cache
        walletCache[walletId] = walletMeta;
        console.log('Wallet metadata stored in cache');
        
        // Return wallet information (excluding sensitive data)
        return {
          id: walletId,
          address,
          balance: 0,
          mnemonic // Only return this during creation
        };
      } catch (operationError) {
        console.error(`Error in wallet creation operation:`, operationError);
        
        // Generate a deterministic address as fallback
        const fallbackAddress = generateDeterministicAddress(walletId);
        
        // Create wallet metadata with fallback address
        const walletMeta = {
          id: walletId,
          userId,
          address: fallbackAddress,
          balance: 0,
          isFallback: true,
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        
        // Store in cache
        walletCache[walletId] = walletMeta;
        
        return {
          id: walletId,
          address: fallbackAddress,
          balance: 0,
          error: operationError.message
        };
      }
    });
  } catch (error) {
    console.error(`Error creating wallet:`, error);
    
    // Generate a deterministic address as ultimate fallback
    const address = generateDeterministicAddress(walletId);
    
    // Store minimal info in cache
    walletCache[walletId] = {
      id: walletId,
      userId,
      address,
      balance: 0,
      isFallback: true,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    return {
      id: walletId,
      address,
      balance: 0,
      error: error.message
    };
  }
}

/**
 * Get wallet address by wallet ID
 * @param {string} walletId - The wallet identifier
 * @returns {Promise<string>} - The wallet address
 */
async function getWalletAddress(walletId) {
  console.log(`Getting address for wallet: ${walletId}`);
  
  try {
    // Check cache first
    if (walletCache[walletId] && walletCache[walletId].address) {
      console.log(`Returning cached address: ${walletCache[walletId].address}`);
      return walletCache[walletId].address;
    }
    
    // Create stronghold path for this wallet
    const strongholdPath = path.join(STRONGHOLD_PATH, `${walletId}.stronghold`);
    
    // Check if file exists
    try {
      await fs.access(strongholdPath);
    } catch (error) {
      throw new Error(`Stronghold file not found for wallet: ${walletId}`);
    }
    
    // Use wallet manager to perform operations
    return walletManager.executeOperation(walletId, async (manager) => {
      // Get account by wallet ID
      const account = await manager.getAccount(walletId);
      
      // Sync account
      try {
        await account.sync();
      } catch (syncError) {
        console.warn('Sync failed, continuing to get addresses:', syncError);
      }
      
      // Get addresses
      const addresses = await account.addresses();
      
      let address;
      if (!addresses || addresses.length === 0) {
        // Generate new address if none exists
        const newAddresses = await account.generateAddresses(1);
        
        if (!newAddresses || newAddresses.length === 0) {
          throw new Error('Failed to generate address');
        }
        
        address = newAddresses[0].address;
      } else {
        address = addresses[0].address;
      }
      
      // Update cache
      if (walletCache[walletId]) {
        walletCache[walletId].address = address;
        walletCache[walletId].lastUpdated = new Date().toISOString();
      } else {
        walletCache[walletId] = {
          id: walletId,
          address,
          lastUpdated: new Date().toISOString()
        };
      }
      
      return address;
    });
  } catch (error) {
    console.error(`Error getting wallet address: ${error.message}`);
    
    // If we have a cached address, use it
    if (walletCache[walletId] && walletCache[walletId].address) {
      console.log(`Using cached address due to error: ${walletCache[walletId].address}`);
      return walletCache[walletId].address;
    }
    
    // Use deterministic address as fallback
    const fallbackAddress = generateDeterministicAddress(walletId);
    console.log(`Using deterministic fallback address: ${fallbackAddress}`);
    
    // Store in cache for future use
    if (walletCache[walletId]) {
      walletCache[walletId].address = fallbackAddress;
      walletCache[walletId].lastUpdated = new Date().toISOString();
    } else {
      walletCache[walletId] = {
        id: walletId,
        address: fallbackAddress,
        lastUpdated: new Date().toISOString()
      };
    }
    
    return fallbackAddress;
  }
}

/**
 * Get wallet balance by wallet ID
 * @param {string} walletId - The wallet identifier
 * @returns {Promise<number>} - The wallet balance
 */
async function getWalletBalance(walletId) {
  console.log(`Getting balance for wallet: ${walletId}`);
  
  try {
    const strongholdPath = path.join(STRONGHOLD_PATH, `${walletId}.stronghold`);
    
    // Check if file exists
    try {
      await fs.access(strongholdPath);
    } catch (error) {
      throw new Error(`Stronghold file not found for wallet: ${walletId}`);
    }
    
    // Use wallet manager to perform operations
    return walletManager.executeOperation(walletId, async (manager) => {
      // Get account by wallet ID
      const account = await manager.getAccount(walletId);
      
      // Sync account to get latest balance
      const balance = await account.sync();
      
      // Extract available balance from the blockchain
      let availableBalance = 0;
      
      if (balance && balance.baseCoin && balance.baseCoin.available) {
        // Convert blockchain balance to display balance (divide by 1,000,000 if needed)
        availableBalance = parseInt(balance.baseCoin.available, 10);
        
        // If the IOTA node returns in microIOTA, normalize to IOTA
        // We're keeping it as the raw value for this sample, but you can adjust as needed
      }
      
      // Update cache
      if (walletCache[walletId]) {
        walletCache[walletId].balance = availableBalance;
        walletCache[walletId].lastUpdated = new Date().toISOString();
      }
      
      return availableBalance;
    });
  } catch (error) {
    console.error(`Error getting wallet balance: ${error.message}`);
    
    // Return cached balance if available
    if (walletCache[walletId] && typeof walletCache[walletId].balance === 'number') {
      console.log(`Using cached balance due to error: ${walletCache[walletId].balance}`);
      return walletCache[walletId].balance;
    }
    
    return 0; // Default to zero balance
  }
}

/**
 * Transfer tokens from one wallet to another
 * @param {string} walletId - The source wallet identifier
 * @param {string} recipientAddress - The recipient's address
 * @param {number} amount - The amount to transfer
 * @returns {Promise<object>} - Transfer results
 */
async function transferTokens(walletId, recipientAddress, amount) {
  console.log(`\n[DIAG] Starting token transfer of ${amount} tokens from wallet ${walletId} to ${recipientAddress}`);
  
  // Add a global handler just for this operation to catch unhandled errors
  const unhandledHandler = (error) => {
    console.error(`[DIAG] UNHANDLED REJECTION IN TRANSFER: ${error}`);
    if (error.stack) console.error(error.stack);
  };
  process.on('unhandledRejection', unhandledHandler);
  
  try {
    // Validate inputs first
    if (!walletId) {
      throw new Error('Wallet ID is required');
    }
    if (!recipientAddress) {
      throw new Error('Recipient address is required');
    }
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    console.log('[DIAG] All inputs validated');
    
    const strongholdPath = path.join(STRONGHOLD_PATH, `${walletId}.stronghold`);
    console.log(`[DIAG] Checking stronghold path: ${strongholdPath}`);
    
    // Check if file exists
    try {
      await fs.access(strongholdPath);
      console.log('[DIAG] Stronghold file exists');
    } catch (error) {
      console.error(`[DIAG] Stronghold file not found: ${error.message}`);
      throw new Error(`Stronghold file not found for wallet: ${walletId}`);
    }
    
    // Try direct approach first if wallet manager has failed before
    let useDirectApproach = true;
    if (process.env.USE_DIRECT_TRANSFERS === 'true') {
      useDirectApproach = true;
      console.log('[DIAG] Using direct transfer approach (wallet manager bypassed)');
    }
    
    if (useDirectApproach) {
      // Try a direct transfer without using wallet manager
      console.log('[DIAG] Creating direct AccountManager');
      
      // Create direct manager with timeout
      const createDirectManager = () => {
        return new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Direct manager creation timed out after 30 seconds'));
          }, 30000);
          
          try {
            const directManager = new AccountManager({
              storagePath: path.join(WALLET_DB_PATH, walletId),
              clientOptions: {
                nodes: ['https://api.testnet.iotaledger.net'],
                localPow: true,
                network: 'testnet'
              },
              coinType: 4218, // IOTA coin type
              secretManager: {
                stronghold: {
                  snapshotPath: strongholdPath,
                  password: PASSWORD
                }
              }
            });
            
            clearTimeout(timeoutId);
            resolve(directManager);
          } catch (createError) {
            clearTimeout(timeoutId);
            reject(createError);
          }
        });
      };
      
      try {
        // Create manager
        const directManager = await createDirectManager();
        console.log('[DIAG] Direct manager created successfully');
        
        // Set password
        try {
          await directManager.setStrongholdPassword(PASSWORD);
          console.log('[DIAG] Direct manager password set');
        } catch (pwError) {
          console.log(`[DIAG] Direct manager password error (may already be set): ${pwError.message}`);
        }
        
        // Get account
        console.log('[DIAG] Getting account directly');
        const getAccount = () => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Get account operation timed out after 30 seconds'));
            }, 30000);
            
            directManager.getAccount(walletId)
              .then(account => {
                clearTimeout(timeoutId);
                resolve(account);
              })
              .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
              });
          });
        };
        
        const directAccount = await getAccount();
        console.log('[DIAG] Direct account retrieved successfully');
        
        // Sync account
        console.log('[DIAG] Syncing account directly');
        const syncAccount = () => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Sync operation timed out after 30 seconds'));
            }, 30000);
            
            directAccount.sync()
              .then(balance => {
                clearTimeout(timeoutId);
                resolve(balance);
              })
              .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
              });
          });
        };
        
        const balance = await syncAccount();
        console.log(`[DIAG] Direct account synced successfully`);
        console.log(`[DIAG] Balance object: ${JSON.stringify(balance)}`);
        
        // Check balance
        let availableBalance = 0;
        if (balance && balance.baseCoin) {
          if (balance.baseCoin.available) {
            availableBalance = parseInt(balance.baseCoin.available, 10);
          } else if (balance.baseCoin.total) {
            availableBalance = parseInt(balance.baseCoin.total, 10);
          }
        }
        
        console.log(`[DIAG] Available balance: ${availableBalance}`);
        
        if (availableBalance < amount) {
          console.log(`[DIAG] Insufficient balance: ${availableBalance} < ${amount}`);
          throw {
            type: 'insufficientFunds',
            error: `insufficient funds ${amount}/${availableBalance} available`
          };
        }
        
        // Send transaction
        console.log('[DIAG] Sending direct transaction');
        const sendTransaction = () => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Send operation timed out after 60 seconds'));
            }, 60000);
            
            const outputs = [{
              address: recipientAddress,
              amount: amount.toString()
            }];
            
            console.log(`[DIAG] Transaction outputs: ${JSON.stringify(outputs)}`);
            
            directAccount.send(outputs, { allowMicroAmount: true })
              .then(result => {
                clearTimeout(timeoutId);
                resolve(result);
              })
              .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
              });
          });
        };
        
        const transaction = await sendTransaction();
        console.log(`[DIAG] Direct transaction sent successfully`);
        console.log(`[DIAG] Transaction result: ${JSON.stringify(transaction)}`);
        
        return {
          success: true,
          transactionId: transaction.transactionId || transaction.id,
          blockId: transaction.blockId,
          amount,
          recipient: recipientAddress,
          newBalance: availableBalance - amount,
          method: 'direct' // indicate this was done directly
        };
      } catch (directError) {
        console.error(`[DIAG] Direct transfer failed: ${directError.message}`);
        console.error(`[DIAG] Falling back to wallet manager approach`);
        // Continue with wallet manager approach
      }
    }
    
    // Use wallet manager to perform operations
    console.log('[DIAG] Executing wallet operation via wallet manager');
    return walletManager.executeOperation(walletId, async (manager) => {
      try {
        // Get account by wallet ID
        console.log('[DIAG] Getting account by wallet ID');
        const getAccount = () => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Get account operation timed out after 30 seconds'));
            }, 30000);
            
            manager.getAccount(walletId)
              .then(account => {
                clearTimeout(timeoutId);
                resolve(account);
              })
              .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
              });
          });
        };
        
        const account = await getAccount();
        console.log('[DIAG] Account retrieved successfully');
        
        // Sync account to get latest balance
        console.log('[DIAG] Syncing account to get latest balance');
        const syncAccount = () => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Sync operation timed out after 30 seconds'));
            }, 30000);
            
            account.sync()
              .then(balance => {
                clearTimeout(timeoutId);
                resolve(balance);
              })
              .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
              });
          });
        };
        
        const balance = await syncAccount();
        console.log('[DIAG] Account synced successfully');
        console.log(`[DIAG] Balance object: ${JSON.stringify(balance)}`);
        
        // Check balance structure
        if (!balance || !balance.baseCoin) {
          console.log('[DIAG] Invalid balance structure:', balance);
          throw new Error('Invalid balance structure returned from sync');
        }
        
        // Extract available balance - be explicit about using available or total based on what's present
        let availableBalance = 0;
        if (balance.baseCoin.available) {
          availableBalance = parseInt(balance.baseCoin.available, 10);
          console.log(`[DIAG] Available balance: ${availableBalance}`);
        } else if (balance.baseCoin.total) {
          availableBalance = parseInt(balance.baseCoin.total, 10);
          console.log(`[DIAG] Using total balance as available: ${availableBalance}`);
        } else {
          console.log('[DIAG] Could not extract balance from object:', balance);
          throw new Error('Unable to determine available balance');
        }
        
        // Check if balance is sufficient
        if (availableBalance < amount) {
          console.error(`[DIAG] Insufficient balance: ${availableBalance} < ${amount}`);
          throw {
            type: 'insufficientFunds',
            error: `insufficient funds ${amount}/${availableBalance} available`
          };
        }
        
        console.log('[DIAG] Balance is sufficient, preparing outputs');
        
        // Prepare the outputs for the transaction
        const outputs = [{
          address: recipientAddress,
          amount: amount.toString() // Make sure amount is a string as required by SDK
        }];
        
        console.log(`[DIAG] Sending transaction with outputs: ${JSON.stringify(outputs)}`);
        
        // Send with timeout to prevent hanging
        const sendTransaction = () => {
          return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error('Send operation timed out after 60 seconds'));
            }, 60000);
            
            account.send(outputs, { allowMicroAmount: true })
              .then(result => {
                clearTimeout(timeoutId);
                resolve(result);
              })
              .catch(error => {
                clearTimeout(timeoutId);
                reject(error);
              });
          });
        };
        
        // Send transaction
        const transaction = await sendTransaction();
        console.log('[DIAG] Transaction sent successfully');
        console.log(`[DIAG] Transaction result: ${JSON.stringify(transaction)}`);
        
        // Extract transaction details
        const transactionId = transaction.transactionId || transaction.id || null;
        const blockId = transaction.blockId || null;
        
        if (!transactionId) {
          console.warn('[DIAG] Transaction completed but no transactionId returned');
        }
        
        // Update balance in cache
        if (walletCache[walletId]) {
          walletCache[walletId].balance = availableBalance - amount;
          walletCache[walletId].lastUpdated = new Date().toISOString();
          console.log(`[DIAG] Updated wallet cache with new balance: ${walletCache[walletId].balance}`);
        } else {
          console.log('[DIAG] No wallet cache entry to update');
        }
        
        return {
          success: true,
          transactionId,
          blockId,
          amount,
          recipient: recipientAddress,
          newBalance: availableBalance - amount,
          method: 'wallet-manager' // indicate this was done via wallet manager
        };
      } catch (accountError) {
        console.error(`[DIAG] Error in account operation: ${accountError.message}`);
        
        // Format the error for better handling upstream
        if (typeof accountError === 'object' && accountError.type) {
          throw accountError; // Already formatted
        } else {
          throw {
            type: 'accountError',
            error: accountError.message || 'Unknown account error',
            details: accountError
          };
        }
      }
    });
  } catch (error) {
    console.error(`[DIAG] Error transferring tokens: ${error.message}`);
    
    // Format the error consistently
    if (typeof error === 'object') {
      if (error.type) {
        // Already formatted
        throw error;
      } else {
        // Format the error object
        throw {
          type: 'transferError',
          error: error.message || 'Unknown transfer error',
          details: error
        };
      }
    } else {
      // Simple error
      throw {
        type: 'transferError',
        error: String(error)
      };
    }
  } finally {
    // Remove the unhandled rejection handler
    process.removeListener('unhandledRejection', unhandledHandler);
    console.log(`[DIAG] Completed token transfer process`);
  }
}
/**
 * Generate a deterministic address (fallback)
 * @param {string} walletId - The wallet identifier
 * @returns {string} - A deterministic address
 */
function generateDeterministicAddress(walletId) {
  const hash = crypto.createHash('sha256').update(walletId).digest('hex');
  return `rms1${hash.substring(0, 56)}`;
}

/**
 * Call faucet API to request tokens
 * @param {string} address - Wallet address
 * @param {number} amount - Amount to request (may be ignored by faucet)
 * @returns {Promise<object>} - Faucet response
 */
async function callFaucet(address, amount) {
  // Convert to base units if needed
  const requestAmount = amount;
  console.log(`Requesting ${baseToDisplay(requestAmount)} ${TOKEN_SYMBOL} (${requestAmount} base units) for address: ${address}`);
  
  try {
    // Always request the exact amount (don't let the faucet decide)
    const payload = { 
      address,
      amount: requestAmount.toString() // Explicitly include the amount parameter
    };
    
    const response = await axios.post(
      networkConfig.faucetApi,
      payload,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    console.log('Faucet response:', response.data);
    
    // Check the actual amount sent by the faucet
    let receivedAmount = requestAmount; // Default to requested amount
    
    // If the faucet specifies a different amount, use that instead
    if (response.data && response.data.amount) {
      receivedAmount = parseInt(response.data.amount, 10);
      console.log(`Faucet specified a different amount: ${receivedAmount} base units`);
    }
    
    return {
      address,
      requestedAmount: requestAmount,
      amount: receivedAmount, // Use the actual amount from the faucet
      transaction_id: response.data.id || `faucet-tx-${Date.now()}`,
      status: 'requested',
      message: null
    };
  } catch (error) {
    console.error(`Error calling faucet: ${error.message}`);
    throw error;
  }
}

/**
 * Request tokens from faucet
 * @param {string} walletId - The wallet identifier
 * @param {number} amount - The amount to request
 * @returns {Promise<object>} - Faucet request result
 */
async function requestFaucetTokens(walletId, displayAmount) {
  // Convert display amount to blockchain amount
  const blockchainAmount = displayToBase(displayAmount);
  
  console.log(`Requesting ${displayAmount} ${TOKEN_SYMBOL} (${blockchainAmount} base units) for wallet: ${walletId}`);
  
  try {
    // Get wallet address
    let address;
    try {
      address = await getWalletAddress(walletId);
    } catch (error) {
      // Use deterministic address as fallback
      address = generateDeterministicAddress(walletId);
      console.log(`Using fallback address: ${address}`);
    }
    
    // Call faucet with the blockchain amount
    const faucetResponse = await callFaucet(address, blockchainAmount);
    
    // Use the amount that was actually received (which might differ from requested amount)
    const actualBlockchainAmount = faucetResponse.amount || blockchainAmount;
    const actualDisplayAmount = baseToDisplay(actualBlockchainAmount);
    
    console.log(`Received ${actualDisplayAmount} ${TOKEN_SYMBOL} (${actualBlockchainAmount} base units) from faucet`);
    
    // Get current balance
    let oldBalance = 0;
    try {
      oldBalance = await getWalletBalance(walletId);
    } catch (error) {
      console.log(`Could not get current balance: ${error.message}`);
    }
    
    // Update cache with expected new balance (using actual received amount)
    const newBalance = oldBalance + actualBlockchainAmount;
    if (walletCache[walletId]) {
      walletCache[walletId].balance = newBalance;
      walletCache[walletId].displayBalance = baseToDisplay(newBalance);
      walletCache[walletId].lastUpdated = new Date().toISOString();
    }
    
    return {
      wallet_id: walletId,
      address,
      requestedAmount: blockchainAmount,
      requestedDisplayAmount: displayAmount,
      amount: actualBlockchainAmount,
      displayAmount: actualDisplayAmount,
      tokenSymbol: TOKEN_SYMBOL,
      transaction_id: faucetResponse.transaction_id,
      block_id: faucetResponse.block_id || null,
      status: faucetResponse.status || 'requested',
      message: faucetResponse.message || null,
      oldBalance,
      newBalance,
      oldDisplayBalance: baseToDisplay(oldBalance),
      newDisplayBalance: baseToDisplay(newBalance)
    };
  } catch (error) {
    console.error(`Error requesting tokens from faucet: ${error.message}`);
    
    // Create fallback response
    const timestamp = Date.now();
    const address = walletCache[walletId]?.address || generateDeterministicAddress(walletId);
    
    return {
      wallet_id: walletId,
      address,
      requestedAmount: blockchainAmount,
      requestedDisplayAmount: displayAmount,
      amount: blockchainAmount, // Use requested amount as fallback
      displayAmount: displayAmount,
      tokenSymbol: TOKEN_SYMBOL,
      transaction_id: `offline_fallback_${timestamp}`,
      block_id: null,
      status: 'offline_fallback',
      message: `Faucet error: ${error.message}`
    };
  }
}

/**
 * Check wallet info and sync with blockchain
 * @param {string} walletId - The wallet identifier
 * @returns {Promise<object>} - Wallet information
 */
async function syncWallet(walletId) {
  console.log(`Syncing wallet: ${walletId}`);
  
  try {
    // Get balance (which will sync with the blockchain)
    const balance = await getWalletBalance(walletId);
    const address = await getWalletAddress(walletId);
    
    return {
      id: walletId,
      address,
      balance,
      displayBalance: baseToDisplay(balance),
      tokenSymbol: TOKEN_SYMBOL,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error syncing wallet: ${error.message}`);
    
    // Return cached info if available
    if (walletCache[walletId]) {
      return {
        ...walletCache[walletId],
        displayBalance: baseToDisplay(walletCache[walletId].balance || 0),
        tokenSymbol: TOKEN_SYMBOL,
        error: error.message,
        offline: true
      };
    }
    
    throw error;
  }
}

/**
 * Delete wallet
 * @param {string} walletId - The wallet identifier
 * @returns {Promise<boolean>} - Success status
 */
async function deleteWallet(walletId) {
  console.log(`Deleting wallet: ${walletId}`);
  
  try {
    // Remove from cache
    delete walletCache[walletId];
    
    // Remove stronghold file
    const strongholdPath = path.join(STRONGHOLD_PATH, `${walletId}.stronghold`);
    try {
      await fs.unlink(strongholdPath);
    } catch (error) {
      console.log(`Error removing stronghold file: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error deleting wallet: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createWallet,
  getWalletAddress,
  getWalletBalance,
  transferTokens,
  requestFaucetTokens,
  syncWallet,
  deleteWallet,
  generateDeterministicAddress,
  networkConfig
};