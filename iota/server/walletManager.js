// walletManager.js - Singleton manager for AccountManager instances
const { AccountManager, CoinType } = require('@iota/wallet');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { setTimeout } = require('timers/promises');

// Configuration constants
const WALLET_DB_PATH = './wallet_database';
const STRONGHOLD_PATH = './wallet_stronghold';
const LOCK_FILES_DIR = WALLET_DB_PATH;
const LOCK_FILE_PATH = path.join(WALLET_DB_PATH, 'LOCK');
const PASSWORD = process.env.STRONGHOLD_PASSWORD || 'your_secure_password';

// Network configuration - Using IOTA Testnet
const networkConfig = {
  nodes: [
    'https://api.testnet.iotaledger.net'
  ],
  primaryNode: 'https://api.testnet.iotaledger.net',
  faucetApi: 'https://faucet.testnet.iotaledger.net/api/enqueue',
  explorerUrl: 'https://explorer.iota.org/iota-testnet',
  networkId: 'testnet',
  coinType: CoinType.IOTA
};

/**
 * @class WalletManager
 * Singleton class to manage AccountManager instances and prevent lock contention
 */
class WalletManager {
  constructor() {
    this.managers = {}; // Cache for AccountManager instances
    this.accounts = {}; // Cache for Account instances
    this.operationQueue = []; // Queue for serializing operations
    this.isProcessingQueue = false; // Flag to track if we're currently processing the queue
    this.isInitialized = false;
    this.operationTimeouts = {}; // Track operation timeouts
  }

  /**
   * Initialize the wallet manager
   */
  async initialize() {
    if (this.isInitialized) return;
    
    console.log('Initializing WalletManager...');
    
    // Ensure directories exist
    await this.ensureDirectories();
    
    // Clean up any existing lock files
    await this.forceCleanLockFiles();
    
    this.isInitialized = true;
    console.log('WalletManager initialized successfully');
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    const dirs = [WALLET_DB_PATH, STRONGHOLD_PATH];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`Ensured directory exists: ${dir}`);
      } catch (error) {
        console.error(`Error creating directory ${dir}:`, error);
      }
    }
  }

  /**
   * Force clean any existing lock files
   */
  async forceCleanLockFiles() {
    try {
      console.log('Cleaning lock files...');
      
      // Check if lock file exists
      try {
        await fs.access(LOCK_FILE_PATH);
        
        // Set file permissions to ensure we can delete it
        await fs.chmod(LOCK_FILE_PATH, 0o666);
        
        // Delete the lock file
        await fs.unlink(LOCK_FILE_PATH);
        console.log('Lock file removed successfully');
      } catch (error) {
        if (error.code !== 'ENOENT') {
          console.error(`Error accessing lock file: ${error.message}`);
          
          // Try with Node's built-in unlock function if available
          try {
            if (fsSync.unlockSync && typeof fsSync.unlockSync === 'function') {
              fsSync.unlockSync(LOCK_FILE_PATH);
              console.log('Unlocked file using fsSync.unlockSync');
            }
          } catch (unlockError) {
            console.error(`Error unlocking file: ${unlockError.message}`);
          }
          
          // Last resort - try to forcefully remove the file
          try {
            // Use exec to run an OS-level command to force delete
            const { exec } = require('child_process');
            exec(`rm -f "${LOCK_FILE_PATH}"`, (execError, stdout, stderr) => {
              if (execError) {
                console.error(`Error force removing lock file: ${execError.message}`);
              } else {
                console.log('Force removed lock file using OS command');
              }
            });
          } catch (execError) {
            console.error(`Error executing force remove: ${execError.message}`);
          }
        }
      }
      
      // Look for and clean up any other lock files in the database directory
      try {
        const files = await fs.readdir(WALLET_DB_PATH);
        for (const file of files) {
          if (file.includes('LOCK') || file.endsWith('.lock')) {
            try {
              await fs.unlink(path.join(WALLET_DB_PATH, file));
              console.log(`Removed lock file: ${file}`);
            } catch (unlinkError) {
              console.error(`Error removing lock file ${file}: ${unlinkError.message}`);
            }
          }
        }
      } catch (readError) {
        console.error(`Error reading wallet database directory: ${readError.message}`);
      }
    } catch (error) {
      console.error(`Error in forceCleanLockFiles: ${error.message}`);
    }
  }

  /**
   * Create or get an AccountManager instance for a wallet
   * @param {string} walletId - The wallet identifier
   * @returns {Promise<AccountManager>} - The AccountManager instance
   */
  async getAccountManager(walletId) {
    // If we already have a manager instance, return it
    if (this.managers[walletId]) {
      console.log(`[DEBUG] Using existing AccountManager for wallet: ${walletId}`);
      return this.managers[walletId];
    }
    
    // Clean lock files before creating a new manager
    await this.forceCleanLockFiles();
    
    // Wait a moment to ensure any pending operations are finished
    await setTimeout(100);
    
    // Create stronghold path for this wallet
    const strongholdPath = path.join(STRONGHOLD_PATH, `${walletId}.stronghold`);
    console.log(`[DEBUG] Stronghold path for wallet ${walletId}: ${strongholdPath}`);
    
    // Check if stronghold file exists
    let strongholdExists = false;
    try {
      await fs.access(strongholdPath);
      strongholdExists = true;
      console.log(`[DEBUG] Stronghold file exists for wallet: ${walletId}`);
    } catch (error) {
      console.log(`[DEBUG] Stronghold file does not exist for wallet: ${walletId} (this is normal for new wallets)`);
    }
    
    // Create database path for this wallet
    const databasePath = path.join(WALLET_DB_PATH, walletId);
    
    // Ensure the wallet database directory exists
    try {
      await fs.mkdir(databasePath, { recursive: true });
      console.log(`[DEBUG] Ensured wallet database directory exists: ${databasePath}`);
    } catch (error) {
      console.error(`[DEBUG] Error creating wallet database directory: ${error.message}`);
    }
    
    // Create manager options with explicit settings for better reliability
    // IMPORTANT: Fixed the apiTimeout issue by removing it - the library expects a Duration struct, not an integer
    const accountManagerOptions = {
      storagePath: databasePath,
      clientOptions: {
        nodes: networkConfig.nodes,
        localPow: true,
        network: 'testnet'
        // Removed apiTimeout: 60 - this was causing the Duration struct error
      },
      coinType: networkConfig.coinType,
      secretManager: {
        stronghold: {
          snapshotPath: strongholdPath,
          password: PASSWORD
        }
      },
    };
    
    console.log(`[DEBUG] Creating new AccountManager for wallet: ${walletId}`);
    console.log(`[DEBUG] Account manager options: nodes=${networkConfig.nodes}, coinType=${networkConfig.coinType}`);
    
    try {
      // Create a new account manager
      const manager = new AccountManager(accountManagerOptions);
      console.log(`[DEBUG] AccountManager created for wallet: ${walletId}`);
      
      // Set stronghold password
      try {
        await manager.setStrongholdPassword(PASSWORD);
        console.log(`[DEBUG] Stronghold password set successfully for wallet: ${walletId}`);
      } catch (passwordError) {
        // Password might already be set, which is fine in some cases
        console.log(`[DEBUG] Note: ${passwordError.message} (may be already set, which is ok)`);
      }
      
      // Cache the manager
      this.managers[walletId] = manager;
      
      return manager;
    } catch (error) {
      console.error(`[DEBUG] Error creating AccountManager: ${error.message}`);
      
      // If there was an error, clean up and try one more time
      console.log(`[DEBUG] Cleaning up and retrying AccountManager creation for wallet: ${walletId}`);
      await this.forceCleanLockFiles();
      await setTimeout(300); // Longer delay on retry
      
      try {
        const manager = new AccountManager(accountManagerOptions);
        console.log(`[DEBUG] Retry successful: AccountManager created for wallet: ${walletId}`);
        
        try {
          await manager.setStrongholdPassword(PASSWORD);
          console.log(`[DEBUG] Stronghold password set successfully on retry for wallet: ${walletId}`);
        } catch (passwordError) {
          console.log(`[DEBUG] Note on retry: ${passwordError.message}`);
        }
        
        this.managers[walletId] = manager;
        return manager;
      } catch (retryError) {
        console.error(`[DEBUG] Error creating AccountManager (retry): ${retryError.message}`);
        throw retryError;
      }
    }
  }

  /**
   * Execute a wallet operation with enhanced error handling and timeouts
   * @param {string} walletId - The wallet identifier
   * @param {function} operation - The operation function to perform
   * @returns {Promise<any>} - The result of the operation
   */
  async executeOperation(walletId, operation) {
    const operationId = `${walletId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    console.log(`[DEBUG] Starting operation ${operationId} for wallet: ${walletId}`);
    
    return new Promise((resolve, reject) => {
      // Set timeout for operation (2 minutes)
      this.operationTimeouts[operationId] = setTimeout(() => {
        console.error(`[DEBUG] Operation ${operationId} timed out after 120 seconds`);
        
        // Clean up
        this.forceCleanLockFiles().catch(err => {
          console.error(`[DEBUG] Error cleaning locks after timeout: ${err.message}`);
        });
        
        // Remove from queue if still there
        this.operationQueue = this.operationQueue.filter(op => op.operationId !== operationId);
        
        reject(new Error(`Operation timed out after 120 seconds`));
      }, 120000); // 2 minute timeout
      
      // Add operation to queue
      this.operationQueue.push({
        walletId,
        operation,
        resolve: async (result) => {
          // Clear timeout
          clearTimeout(this.operationTimeouts[operationId]);
          delete this.operationTimeouts[operationId];
          
          console.log(`[DEBUG] Operation ${operationId} completed successfully`);
          resolve(result);
        },
        reject: async (error) => {
          // Clear timeout
          clearTimeout(this.operationTimeouts[operationId]);
          delete this.operationTimeouts[operationId];
          
          console.error(`[DEBUG] Operation ${operationId} failed: ${error.message || JSON.stringify(error)}`);
          reject(error);
        },
        operationId
      });
      
      // Start processing the queue if not already processing
      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process operations from the queue with enhanced error handling
   */
  async processQueue() {
    if (this.isProcessingQueue || this.operationQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    console.log(`[DEBUG] Processing queue with ${this.operationQueue.length} operations`);
    
    try {
      // Get the next operation from the queue
      const { walletId, operation, resolve, reject, operationId } = this.operationQueue.shift();
      
      console.log(`[DEBUG] Processing operation ${operationId} for wallet: ${walletId}`);
      
      try {
        // Create wallet-specific lock file
        const walletLockPath = path.join(LOCK_FILES_DIR, `${walletId}.lock`);
        try {
          await fs.writeFile(walletLockPath, Date.now().toString());
          console.log(`[DEBUG] Created wallet-specific lock file: ${walletLockPath}`);
        } catch (lockError) {
          console.warn(`[DEBUG] Error creating wallet lock: ${lockError.message} (continuing anyway)`);
        }
        
        // Try to get an account manager
        let manager;
        try {
          manager = await this.getAccountManager(walletId);
          console.log(`[DEBUG] Got account manager for operation ${operationId}`);
        } catch (managerError) {
          console.error(`[DEBUG] Error getting account manager: ${managerError.message}`);
          
          // Try a more aggressive cleanup approach
          console.log(`[DEBUG] Performing aggressive cleanup for wallet: ${walletId}`);
          await this.forceCleanLockFiles();
          delete this.managers[walletId];
          await setTimeout(500);
          
          // Try once more
          manager = await this.getAccountManager(walletId);
          console.log(`[DEBUG] Got account manager on retry for operation ${operationId}`);
        }
        
        // Execute the operation with explicit try/catch for better error details
        let result;
        try {
          console.log(`[DEBUG] Executing operation ${operationId}...`);
          result = await operation(manager);
          console.log(`[DEBUG] Operation ${operationId} execution successful`);
        } catch (operationError) {
          console.error(`[DEBUG] Operation ${operationId} execution failed: ${operationError.message || JSON.stringify(operationError)}`);
          
          // For transfer operations, try to get more detailed error info
          if (operationError.type === 'Transfer' || operationError.message?.includes('transfer') || operationError.message?.includes('send')) {
            console.error(`[DEBUG] Transfer error details:`, operationError);
            
            // Check for insufficient funds
            if (operationError.message?.includes('insufficient') || operationError.message?.includes('balance')) {
              throw {
                type: 'insufficientFunds',
                error: operationError.message,
                details: operationError
              };
            }
          }
          
          throw operationError;
        }
        
        // Remove wallet-specific lock file
        try {
          await fs.unlink(walletLockPath);
          console.log(`[DEBUG] Removed wallet-specific lock file: ${walletLockPath}`);
        } catch (unlockError) {
          console.warn(`[DEBUG] Error removing wallet lock: ${unlockError.message}`);
        }
        
        // Resolve with the result
        resolve(result);
      } catch (error) {
        // If there was an error, reject the promise
        console.error(`[DEBUG] Error in operation ${operationId}: ${error.message || JSON.stringify(error)}`);
        reject(error);
        
        // Clean up after error
        console.log(`[DEBUG] Cleaning up after error in operation ${operationId}`);
        await this.forceCleanLockFiles();
        
        // For certain errors, remove the manager instance to force recreation
        if (
          error.message?.includes('lock') || 
          error.message?.includes('already in use') ||
          error.message?.includes('timeout')
        ) {
          console.log(`[DEBUG] Removing manager for wallet ${walletId} due to lock/timeout issue`);
          delete this.managers[walletId];
        }
      }
    } catch (error) {
      console.error(`[DEBUG] Error in processQueue: ${error.message}`);
    } finally {
      // Mark as not processing anymore
      this.isProcessingQueue = false;
      
      // If there are more operations, continue processing
      if (this.operationQueue.length > 0) {
        await setTimeout(200); // Small delay to prevent CPU spinning
        this.processQueue();
      } else {
        console.log(`[DEBUG] Queue processing complete`);
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    console.log('[DEBUG] Cleaning up WalletManager resources...');
    
    // Clear all timeouts
    Object.keys(this.operationTimeouts).forEach(key => {
      clearTimeout(this.operationTimeouts[key]);
    });
    
    // Clear all cached managers
    this.managers = {};
    this.accounts = {};
    
    // Clean lock files
    await this.forceCleanLockFiles();
    
    console.log('[DEBUG] WalletManager cleanup complete');
  }
}


async function executeOperation(walletId, operation) {
  console.log(`\n[DIAG] Starting wallet operation for wallet: ${walletId}`);
  
  // Create a unique lock file path for this wallet
  const lockFilePath = path.join(WALLET_DB_PATH, `${walletId}.lock`);
  
  // Make sure the wallet directory exists
  const walletDatabasePath = path.join(WALLET_DB_PATH, walletId);
  try {
    await fs.mkdir(walletDatabasePath, { recursive: true });
    console.log(`[DIAG] Ensured wallet directory exists: ${walletDatabasePath}`);
  } catch (dirError) {
    console.error(`[DIAG] Error creating wallet directory: ${dirError.message}`);
  }
  
  let manager = null;
  try {
    // Clean any previous lock files first to avoid conflicts
    await this.forceCleanLockFiles();
    console.log(`[DIAG] Cleaned lock files before operation`);
    
    // Create a wallet lock file to prevent parallel operations
    try {
      await fs.writeFile(lockFilePath, Date.now().toString(), { flag: 'wx' });
      console.log(`[DIAG] Created lock file: ${lockFilePath}`);
    } catch (lockError) {
      console.error(`[DIAG] Error creating lock file (may already exist): ${lockError.message}`);
      
      try {
        // If lock file exists, check if it's stale (older than 5 minutes)
        const lockStat = await fs.stat(lockFilePath);
        const lockAge = Date.now() - lockStat.mtimeMs;
        
        if (lockAge > 5 * 60 * 1000) { // 5 minutes
          console.log(`[DIAG] Found stale lock file (${lockAge}ms old), removing...`);
          await fs.unlink(lockFilePath);
          await fs.writeFile(lockFilePath, Date.now().toString(), { flag: 'w' });
          console.log(`[DIAG] Replaced stale lock file`);
        } else {
          throw new Error(`Wallet ${walletId} is currently locked by another operation (lock age: ${lockAge}ms)`);
        }
      } catch (staleCheckError) {
        throw new Error(`Cannot create lock file: ${staleCheckError.message}`);
      }
    }
    
    // Check if stronghold file exists
    const strongholdPath = path.join(STRONGHOLD_PATH, `${walletId}.stronghold`);
    console.log(`[DIAG] Checking stronghold file: ${strongholdPath}`);
    
    try {
      await fs.access(strongholdPath);
      console.log(`[DIAG] Stronghold file exists`);
    } catch (strongholdError) {
      console.error(`[DIAG] Stronghold file not found: ${strongholdError.message}`);
      throw new Error(`Stronghold file not found for wallet: ${walletId}`);
    }
    
    // Initialize AccountManager with detailed logging
    console.log(`[DIAG] Creating new AccountManager for wallet: ${walletId}`);
    
    // Log more details about the manager creation
    console.log(`[DIAG] Manager options: {
      storagePath: ${walletDatabasePath},
      nodes: [${NODE_URL}],
      coinType: ${networkConfig.coinType},
      snapshotPath: ${strongholdPath}
    }`);
    
    // Create the manager - wrapped in a timeout to prevent hanging
    const createManagerWithTimeout = async (timeoutMs = 30000) => {
      return new Promise((resolve, reject) => {
        // Set timeout for manager creation
        const timeoutId = setTimeout(() => {
          reject(new Error(`AccountManager creation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        
        // Start manager creation
        try {
          const mgr = new AccountManager({
            storagePath: walletDatabasePath,
            clientOptions: {
              nodes: [NODE_URL],
              localPow: true,
              network: 'testnet', // Explicitly specify testnet
            },
            coinType: networkConfig.coinType, 
            secretManager: {
              stronghold: {
                snapshotPath: strongholdPath,
                password: PASSWORD 
              }
            }
          });
          
          // Clear timeout and resolve
          clearTimeout(timeoutId);
          resolve(mgr);
        } catch (createError) {
          // Clear timeout and reject with error
          clearTimeout(timeoutId);
          reject(createError);
        }
      });
    };
    
    try {
      manager = await createManagerWithTimeout();
      console.log(`[DIAG] AccountManager created successfully`);
    } catch (createError) {
      console.error(`[DIAG] Error creating AccountManager: ${createError.message}`);
      // Check if it's a timeout error
      if (createError.message && createError.message.includes('timed out')) {
        console.error(`[DIAG] Your operation has timed out, suggesting a deadlock or very slow system.`);
        console.error(`[DIAG] This is a common issue with the IOTA wallet library.`);
      }
      throw createError;
    }
    
    // Set stronghold password (only needed once)
    try {
      console.log(`[DIAG] Setting stronghold password`);
      await manager.setStrongholdPassword(PASSWORD);
      console.log(`[DIAG] Stronghold password set successfully`);
    } catch (passwordError) {
      // This might error if password is already set, which is fine
      console.log(`[DIAG] Stronghold password already set or error: ${passwordError.message}`);
    }
    
    // Execute the provided operation with the manager
    console.log(`[DIAG] Executing operation with manager`);
    
    // Operation execution with timeout
    const executeWithTimeout = async (timeoutMs = 60000) => {
      return new Promise((resolve, reject) => {
        // Set timeout for operation
        const timeoutId = setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        
        // Execute operation
        operation(manager)
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
    
    try {
      const result = await executeWithTimeout();
      console.log(`[DIAG] Operation executed successfully`);
      return result;
    } catch (operationError) {
      console.error(`[DIAG] Error in operation: ${operationError.message}`);
      
      // Check for specific error patterns
      if (operationError.message && operationError.message.includes('Network')) {
        console.error(`[DIAG] Network error detected. This suggests connectivity issues to the IOTA network.`);
      } else if (operationError.message && operationError.message.includes('timed out')) {
        console.error(`[DIAG] Operation timed out. This suggests a deadlock or very slow system.`);
      }
      
      throw operationError;
    }
  } catch (error) {
    console.error(`[DIAG] Error in executeOperation: ${error.message}`);
    throw error;
  } finally {
    // Always clean up lock file
    try {
      if (lockFilePath) {
        await fs.unlink(lockFilePath);
        console.log(`[DIAG] Removed lock file: ${lockFilePath}`);
      }
    } catch (unlockError) {
      console.error(`[DIAG] Error removing lock file: ${unlockError.message}`);
    }
    
    // Explicitly log that we're done
    console.log(`[DIAG] Wallet operation complete for wallet: ${walletId}`);
  }
}

// Create singleton instance
const walletManager = new WalletManager();

module.exports = walletManager;