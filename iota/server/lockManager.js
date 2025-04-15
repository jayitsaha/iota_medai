// lockManager.js - Manage wallet database locks
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

// Configuration constants
const WALLET_DB_PATH = './wallet_database';
const LOCK_FILE_PATH = path.join(WALLET_DB_PATH, 'LOCK');

/**
 * Utility to clear stale lock files and manage AccountManager instances
 */
class LockManager {
  constructor() {
    this.managers = {};
    this.isClearing = false;
    this.clearPromise = null;
  }

  /**
   * Clear any stale lock files from the wallet database
   * @returns {Promise<boolean>} - Success status
   */
  async clearLockFile() {
    // If already clearing, wait for that operation to complete
    if (this.isClearing) {
      return this.clearPromise;
    }

    this.isClearing = true;
    this.clearPromise = (async () => {
      try {
        // Check if lock file exists
        try {
          const stats = await fs.stat(LOCK_FILE_PATH);
          console.log(`Found lock file at ${LOCK_FILE_PATH}, clearing...`);
          await fs.unlink(LOCK_FILE_PATH);
          console.log('Lock file cleared successfully');
          return true;
        } catch (statError) {
          // If file doesn't exist, that's fine
          if (statError.code === 'ENOENT') {
            return true;
          }
          console.error(`Error checking lock file: ${statError.message}`);
          return false;
        }
      } catch (error) {
        console.error(`Error clearing lock file: ${error.message}`);
        return false;
      } finally {
        this.isClearing = false;
      }
    })();

    return this.clearPromise;
  }

  /**
   * Setup function to be called at server startup
   * @returns {Promise<void>}
   */
  async setup() {
    console.log('Setting up LockManager - checking for stale lock files');
    await this.clearLockFile();
    
    // Ensure wallet_database directory exists
    try {
      await fs.mkdir(WALLET_DB_PATH, { recursive: true });
      console.log(`Ensured ${WALLET_DB_PATH} directory exists`);
    } catch (error) {
      console.error(`Error creating wallet database directory: ${error.message}`);
    }
  }

  /**
   * Cleanup function to be called before server shutdown
   * @returns {Promise<void>}
   */
  async cleanup() {
    console.log('Cleaning up LockManager resources');
    
    // Clear any remaining lock files
    await this.clearLockFile();
  }
}

// Create and export singleton instance
const lockManager = new LockManager();

module.exports = lockManager;