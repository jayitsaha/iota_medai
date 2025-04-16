import React, { createContext, useContext, useState, useEffect } from 'react';
import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG.API_URL || 'http://localhost:3000/api';

// Create a context for wallet functionality
const WalletContext = createContext();

// Fixed constants for wallet
const FIXED_USER_ID = 'fixed_user_123';
const FIXED_WALLET_ID = 'fixed_wallet_123';

// Enhanced helper function to handle fetch errors with better debugging
const handleResponse = async (response) => {
  // First save the raw response text for debugging
  const rawText = await response.text();
  
  if (!response.ok) {
    let errorMessage = 'Network response was not ok';
    try {
      // Try to parse as JSON, but fallback to raw text if parsing fails
      const errorData = JSON.parse(rawText);
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      console.error('Error parsing error response:', e);
      // Use the raw text as the error message for better debugging
      errorMessage = `Server error: ${rawText.substring(0, 200)}${rawText.length > 200 ? '...' : ''}`;
    }
    throw new Error(errorMessage);
  }
  
  try {
    // Try to parse the response text as JSON
    return JSON.parse(rawText);
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    console.error('Raw response:', rawText);
    throw new Error(`Invalid response format from server: ${rawText.substring(0, 200)}${rawText.length > 200 ? '...' : ''}`);
  }
};

// Provider component to wrap app with wallet functionality
export const WalletProvider = ({ children }) => {
  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [detailedError, setDetailedError] = useState(null); // For more detailed error info
  const [blockchainStatus, setBlockchainStatus] = useState(null); // Blockchain status 
  const [isRecovering, setIsRecovering] = useState(false); // Track recovery process

  // Initialize wallet on component mount
  useEffect(() => {
    initializeWallet();
  }, []);

  // Get user ID (use fixed ID for consistency)
  const getUserId = () => {
    return FIXED_USER_ID;
  };

  // Check if error is a Stronghold not found error
  const isStrongholdNotFoundError = (error) => {
    return error && 
           (error.includes('Stronghold file not found') || 
            error.includes('wallet not found') ||
            error.includes('missing wallet'));
  };

  // Initialize wallet (create or load existing)
  const initializeWallet = async (forceCreate = false) => {
    try {
      setLoading(true);
      setError(null);
      setDetailedError(null);
      
      const userId = getUserId();
      
      // If forceCreate is true, skip the fetch attempt and go straight to creation
      if (!forceCreate) {
        try {
          // Try to fetch existing wallet info
          const response = await fetch(`${API_URL}/wallet`, {
            headers: {
              'User-ID': userId
            }
          });
          
          const data = await handleResponse(response);
          setAddress(data.address);
          setBalance(data.balance);
          setTransactions(data.transactions || []);
          if (data.lastUpdated) {
            setLastUpdated(new Date(data.lastUpdated));
          }
          if (data.blockchain) {
            setBlockchainStatus(data.blockchain);
            console.log('Blockchain status:', data.blockchain);
          }
          setInitialized(true);
          return true; // Successfully initialized existing wallet
        } catch (fetchError) {
          console.error('Error fetching wallet:', fetchError);
          
          // If this is a "Stronghold file not found" error, we should reset and create a new wallet
          if (fetchError.message && isStrongholdNotFoundError(fetchError.message)) {
            console.log('Stronghold file not found, resetting and creating new wallet...');
            return resetAndCreateWallet();
          }
          
          // Continue to wallet creation for other errors
        }
      }
      
      try {
        // If wallet doesn't exist or forceCreate is true, create a new one
        console.log('Creating new wallet...');
        const createResponse = await fetch(`${API_URL}/wallet/initialize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-ID': userId
          }
        });
        
        const createData = await handleResponse(createResponse);
        setAddress(createData.address);
        setBalance(createData.balance);
        setInitialized(true);
        setLastUpdated(new Date());
        if (createData.blockchain) {
          setBlockchainStatus(createData.blockchain);
          console.log('Blockchain status after creation:', createData.blockchain);
        }
        return true; // Successfully created new wallet
      } catch (createError) {
        console.error('Error creating wallet:', createError);
        setDetailedError({
          message: createError.message,
          type: 'creation',
          timestamp: new Date().toISOString()
        });
        
        // If already exists error, try to fetch it again
        if (createError.message && createError.message.includes('already exists')) {
          return getBalance(); // Try to fetch the wallet again
        }
        
        // Show error message and fail
        setError('Failed to create wallet. Check console for details.');
        return false; // Failed to create wallet
      }
    } catch (err) {
      console.error('Error initializing wallet:', err);
      setDetailedError({
        message: err.message,
        type: 'initialization',
        timestamp: new Date().toISOString()
      });
      setError('Failed to initialize wallet. Please try again.');
      return false; // Failed to initialize wallet
    } finally {
      setLoading(false);
    }
  };

  // Reset wallet state and try to create a new wallet
  const resetAndCreateWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRecovering(true);
      
      // Delete the wallet first
      const resetResponse = await fetch(`${API_URL}/wallet/reset`, {
        method: 'DELETE',
        headers: {
          'User-ID': getUserId()
        }
      });
      
      const resetData = await handleResponse(resetResponse);
      
      // Reset local state
      setBalance(0);
      setAddress(null);
      setTransactions([]);
      setInitialized(false);
      
      console.log('Wallet reset successfully:', resetData.message);
      
      // Force create a new wallet
      const result = await initializeWallet(true);
      setIsRecovering(false);
      return result;
    } catch (error) {
      console.error('Failed to reset wallet on server:', error);
      setError(`Failed to reset wallet: ${error.message}`);
      setLoading(false);
      setIsRecovering(false);
      return false;
    }
  };

  // Sync wallet with blockchain
  const syncWallet = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = getUserId();
      
      // Add timeout to the fetch call to prevent long hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        const response = await fetch(`${API_URL}/wallet/sync`, {
          method: 'POST',
          headers: {
            'User-ID': userId
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const result = await handleResponse(response);
        
        if (result.blockchain) {
          setBlockchainStatus(result.blockchain);
          console.log('Blockchain status after sync:', result.blockchain);
        }
        
        if (result.newBalance !== balance) {
          setBalance(result.newBalance);
        }
        
        setLastUpdated(new Date());
        
        // Also refresh transactions
        try {
          await getTransactionHistory();
        } catch (txErr) {
          console.log('Non-critical error getting transaction history:', txErr);
          // Continue even if this fails
        }
        
        setLoading(false);
        return result;
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        
        // Handle abort/timeout specially
        if (fetchErr.name === 'AbortError') {
          console.log('Sync request timed out - falling back to local data');
          throw new Error('Sync request timed out');
        }
        
        throw fetchErr;
      }
    } catch (err) {
      console.error('Error syncing wallet:', err);
      
      // Fallback to just getting balance if sync fails
      try {
        console.log('Trying to get balance as fallback...');
        await getBalance();
      } catch (balanceErr) {
        console.log('Even balance fallback failed:', balanceErr);
      }
      
      // If this is a "Stronghold file not found" error, we should reset and create a new wallet
      if (err.message && isStrongholdNotFoundError(err.message)) {
        console.log('Stronghold file not found during sync, attempting recovery...');
        
        // Only try to recover if we're not already recovering
        if (!isRecovering) {
          return resetAndCreateWallet();
        } else {
          setError('Wallet recovery already in progress');
        }
      } else {
        setError('Failed to sync wallet with blockchain: ' + err.message);
      }
      
      setLoading(false);
      throw err;
    }
  };

  // Get current wallet address
  const getAddress = async () => {
    try {
      setLoading(true);
      
      const userId = getUserId();
      
      const response = await fetch(`${API_URL}/wallet/address`, {
        headers: {
          'User-ID': userId
        }
      });
      
      const data = await handleResponse(response);
      setAddress(data.address);
      
      if (data.blockchain) {
        setBlockchainStatus(data.blockchain);
        console.log('Blockchain status after getting address:', data.blockchain);
      }
      
      setLoading(false);
      return data.address;
    } catch (err) {
      console.error('Error fetching address:', err);
      
      // If this is a "Stronghold file not found" error, we should reset and create a new wallet
      if (err.message && isStrongholdNotFoundError(err.message)) {
        console.log('Stronghold file not found during getAddress, attempting recovery...');
        
        // Only try to recover if we're not already recovering
        if (!isRecovering) {
          return resetAndCreateWallet().then(() => getAddress());
        }
      }
      
      setError('Failed to fetch wallet address: ' + err.message);
      setLoading(false);
      throw err;
    }
  };

  // Get current balance
  const getBalance = async () => {
    try {
      setLoading(true);
      
      const userId = getUserId();
      
      const response = await fetch(`${API_URL}/wallet`, {
        headers: {
          'User-ID': userId
        }
      });
      
      const data = await handleResponse(response);
      setAddress(data.address);
      setBalance(data.balance);
      setTransactions(data.transactions || []);
      if (data.lastUpdated) {
        setLastUpdated(new Date(data.lastUpdated));
      }
      if (data.blockchain) {
        setBlockchainStatus(data.blockchain);
        console.log('Blockchain status after getting balance:', data.blockchain);
      }
      
      setLoading(false);
      return data.balance;
    } catch (err) {
      console.error('Error fetching balance:', err);
      
      // If this is a "Stronghold file not found" error, we should reset and create a new wallet
      if (err.message && isStrongholdNotFoundError(err.message)) {
        console.log('Stronghold file not found during getBalance, attempting recovery...');
        
        // Only try to recover if we're not already recovering
        if (!isRecovering) {
          return resetAndCreateWallet().then(() => getBalance());
        }
      }
      
      setError('Failed to fetch balance: ' + err.message);
      setLoading(false);
      throw err;
    }
  };

  // Make a payment (transfer tokens)
  const makePayment = async (recipientAddress, amount) => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = getUserId();
      
      const response = await fetch(`${API_URL}/wallet/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-ID': userId
        },
        body: JSON.stringify({
          recipientAddress,
          amount
        })
      });
      
      const result = await handleResponse(response);
      
      // Update balance
      setBalance(result.newBalance);
      
      if (result.blockchain) {
        setBlockchainStatus(result.blockchain);
        console.log('Blockchain status after payment:', result.blockchain);
      }
      
      // Get updated transactions
      await getTransactionHistory();
      
      setLoading(false);
      return result;
    } catch (err) {
      console.error('Error making payment:', err);
      
      // Specific error handling for insufficient funds
      if (err.message.includes('Insufficient balance')) {
        setError('Insufficient balance to complete this transaction');
      } else if (err.message && isStrongholdNotFoundError(err.message)) {
        console.log('Stronghold file not found during payment, attempting recovery...');
        
        // Only try to recover if we're not already recovering
        if (!isRecovering) {
          await resetAndCreateWallet();
          setError('Wallet was reset due to file not found error. Please try your payment again.');
        }
      } else {
        setError(`Failed to process payment: ${err.message}`);
      }
      
      setLoading(false);
      throw err;
    }
  };

  // Get transaction history
  const getTransactionHistory = async () => {
    try {
      setLoading(true);
      
      const userId = getUserId();
      
      // Use dedicated transactions endpoint instead of wallet endpoint
      const response = await fetch(`${API_URL}/wallet/transactions`, {
        headers: {
          'User-ID': userId
        }
      });
      
      const data = await handleResponse(response);
      
      // Update local transactions state
      if (data.transactions) {
        setTransactions(data.transactions);
      }
      
      setLoading(false);
      return { 
        transactions: data.transactions || [], 
        total: data.total || 0 
      };
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      
      // If this is a "Stronghold file not found" error, we should reset and create a new wallet
      if (err.message && isStrongholdNotFoundError(err.message)) {
        console.log('Stronghold file not found during getTransactionHistory, attempting recovery...');
        
        // Only try to recover if we're not already recovering
        if (!isRecovering) {
          await resetAndCreateWallet();
          return getTransactionHistory();
        }
      }
      
      setError('Failed to fetch transaction history: ' + err.message);
      setLoading(false);
      throw err;
    }
  };

  // Request tokens from faucet - IMPROVED
  const requestTokens = async (amount = 100) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Requesting ${amount} tokens from testnet faucet...`);
      
      const userId = getUserId();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      try {
        const response = await fetch(`${API_URL}/wallet/request-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-ID': userId
          },
          body: JSON.stringify({ amount }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const result = await handleResponse(response);
        console.log('Token request result:', result);
        
        // Immediately update balance in state
        if (result.newBalance !== undefined) {
          console.log(`Updating balance from ${balance} to ${result.newBalance}`);
          setBalance(result.newBalance);
        }
        
        if (result.blockchain) {
          setBlockchainStatus(result.blockchain);
          console.log('Blockchain status after token request:', result.blockchain);
        }
        
        // Check if this was a fallback local operation
        if (result.warning) {
          console.warn('Faucet warning:', result.warning);
        }
        
        // Get updated transactions
        try {
          await getTransactionHistory();
        } catch (txErr) {
          console.log('Non-critical error getting transaction history:', txErr);
          // Continue even if this fails
        }
        
        // If this was a real faucet request, schedule a balance check
        // to detect when tokens actually arrive
        if (!result.warning && result.faucetResponse) {
          console.log('Scheduling balance check for faucet tokens...');
          
          // Schedule a delayed balance check
          setTimeout(async () => {
            try {
              console.log('Checking if faucet tokens have arrived...');
              await getBalance();
              console.log('Balance updated after faucet check');
            } catch (balanceErr) {
              console.log('Error checking for faucet tokens:', balanceErr);
            }
          }, 30000); // Check after 30 seconds
        }
        
        setLoading(false);
        return result;
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        
        if (fetchErr.name === 'AbortError') {
          throw new Error('Request timed out. The faucet request may still be processing.');
        }
        
        throw fetchErr;
      }
    } catch (err) {
      console.error('Error requesting tokens:', err);
      
      setError(`Failed to request tokens: ${err.message}`);
      setLoading(false);
      throw err;
    }
  };
  // Format transaction for display
  const formatTransaction = (tx) => {
    return {
      ...tx,
      formattedDate: new Date(tx.timestamp).toLocaleString(),
      formattedAmount: `${tx.type === 'payment' ? '-' : '+'}${tx.amount} MEDAI`,
      statusColor: tx.status === 'confirmed' ? '#4CAF50' : 
                   tx.status === 'pending' ? '#FF9800' : '#F44336'
    };
  };

  // Value object to be provided to consumers
  const value = {
    balance,
    address,
    transactions,
    loading,
    error,
    initialized,
    lastUpdated,
    detailedError, // Expose detailed error info
    blockchainStatus, // Expose blockchain status
    getBalance,
    getAddress,
    makePayment,
    getTransactionHistory,
    requestTokens,
    refreshWallet: initializeWallet,
    resetAndCreateWallet, // Add new function to reset and create wallet
    syncWallet, // Add sync function
    formatTransaction
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Hook to use the wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};