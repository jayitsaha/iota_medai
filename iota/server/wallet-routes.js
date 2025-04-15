// wallet-routes.js - API endpoints for wallet operations
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;

// Import wallet service
const walletService = require('./walletService');

// Import token utilities
const { 
  TOKEN_SYMBOL, 
  baseToDisplay, 
  displayToBase, 
  formatTokenAmount 
} = require('./tokenUtils');

// Import file storage utilities
const {
  findById,
  findMany,
  create,
  update,
  remove,
  query
} = require('./utils/fileStorage');

// Import authentication middleware
const { authenticate } = require('./middleware/authenticate');

const router = express.Router();

// Fixed wallet and user IDs for simpler development
const FIXED_WALLET_ID = 'fixed_wallet_123';
const FIXED_USER_ID = 'fixed_user_123';

// GET /api/wallet - Get user wallet info
router.get('/wallet', authenticate, async (req, res) => {
  try {
    // Override with fixed user ID if needed
    const userId = FIXED_USER_ID || req.user.id;
    
    // Find user's wallet record in database
    let wallet = await findById('wallets.json', userId, 'user');
    
    if (!wallet) {
      return res.status(404).json({ 
        error: 'Wallet not found',
        message: 'Please initialize your wallet first'
      });
    }
    
    // Get wallet info from blockchain service
    try {
      const walletInfo = await walletService.syncWallet(wallet.walletId);
      
      // Convert from base units to display units
      const displayBalance = baseToDisplay(walletInfo.balance);
      
      // Update wallet record if balance changed
      if (walletInfo.balance !== wallet.balance) {
        await update('wallets.json', wallet.id, {
          balance: walletInfo.balance, // Store raw balance in database
          displayBalance: displayBalance, // Also store display balance for convenience
          lastUpdated: new Date().toISOString()
        });
        
        wallet.balance = walletInfo.balance;
        wallet.displayBalance = displayBalance;
        wallet.lastUpdated = new Date().toISOString();
      }
      
      // Get transactions history
      const queryOptions = {
        filters: {
          $or: [
            { sender: userId },
            { recipient: userId }
          ]
        },
        sort: 'timestamp:desc',
        limit: 10
      };
      
      const transactionsResult = await query('transactions.json', queryOptions);
      
      // Transform transactions for client
      const transformedTransactions = await Promise.all(transactionsResult.data.map(async (tx) => {
        // Determine transaction type and other party
        const isSender = tx.sender === userId;
        const otherPartyId = isSender ? tx.recipient : tx.sender;
        let otherPartyName = 'Unknown';
        
        if (otherPartyId) {
          const otherUser = await findById('users.json', otherPartyId);
          if (otherUser) {
            otherPartyName = otherUser.name;
          }
        } else if (tx.description === 'Faucet request') {
          otherPartyName = 'IOTA Faucet';
        }
        
        // Convert transaction amount to display units
        const displayAmount = baseToDisplay(tx.amount);
        
        return {
          id: tx.id,
          type: isSender ? 'payment' : 'deposit',
          amount: displayAmount,
          amountFormatted: formatTokenAmount(displayAmount),
          sender: isSender ? req.user?.name || 'You' : otherPartyName,
          recipient: isSender ? otherPartyName : req.user?.name || 'You',
          timestamp: tx.timestamp,
          status: tx.status || 'confirmed',
          blockId: tx.transactionId || 'local-tx-' + tx.id.substring(0, 8)
        };
      }));
      
      // Get blockchain status
      const blockchainStatus = {
        time: new Date().toISOString(),
        status: walletInfo.offline ? "Limited" : "Connected",
        network: "Shimmer Testnet",
        nodeUrl: walletService.networkConfig.node,
        walletId: wallet.walletId,
        userId,
        tokenSymbol: TOKEN_SYMBOL
      };
      
      // Return wallet data with proper display balance
      res.json({
        address: walletInfo.address,
        balance: displayBalance,
        balanceFormatted: formatTokenAmount(displayBalance),
        tokenSymbol: TOKEN_SYMBOL,
        transactions: transformedTransactions,
        lastUpdated: walletInfo.lastUpdated || wallet.lastUpdated,
        recovered: wallet.recovered,
        blockchain: blockchainStatus
      });
    } catch (serviceError) {
      console.error('Error syncing wallet with blockchain:', serviceError);
      
      // Get transactions for fallback response
      const queryOptions = {
        filters: {
          $or: [
            { sender: userId },
            { recipient: userId }
          ]
        },
        sort: 'timestamp:desc',
        limit: 10
      };
      
      const transactionsResult = await query('transactions.json', queryOptions);
      
      // Convert stored balance to display balance
      const displayBalance = wallet.displayBalance || baseToDisplay(wallet.balance || 0);
      
      const transformedTransactions = await Promise.all(transactionsResult.data.map(async (tx) => {
        // Determine transaction type and other party
        const isSender = tx.sender === userId;
        const otherPartyId = isSender ? tx.recipient : tx.sender;
        let otherPartyName = 'Unknown';
        
        if (otherPartyId) {
          const otherUser = await findById('users.json', otherPartyId);
          if (otherUser) {
            otherPartyName = otherUser.name;
          }
        } else if (tx.description === 'Faucet request') {
          otherPartyName = 'IOTA Faucet';
        }
        
        // Convert transaction amount to display units
        const displayAmount = baseToDisplay(tx.amount);
        
        return {
          id: tx.id,
          type: isSender ? 'payment' : 'deposit',
          amount: displayAmount,
          amountFormatted: formatTokenAmount(displayAmount),
          sender: isSender ? req.user?.name || 'You' : otherPartyName,
          recipient: isSender ? otherPartyName : req.user?.name || 'You',
          timestamp: tx.timestamp,
          status: tx.status || 'confirmed',
          blockId: tx.transactionId || 'local-tx-' + tx.id.substring(0, 8)
        };
      }));
      
      // Get limited blockchain status
      const blockchainStatus = {
        time: new Date().toISOString(),
        status: "Limited",
        network: "Shimmer Testnet",
        nodeUrl: walletService.networkConfig.node,
        error: serviceError.message,
        walletId: wallet.walletId,
        userId,
        tokenSymbol: TOKEN_SYMBOL
      };
      
      // Return wallet data with cached information
      return res.json({
        address: wallet.address,
        balance: displayBalance,
        balanceFormatted: formatTokenAmount(displayBalance),
        tokenSymbol: TOKEN_SYMBOL,
        transactions: transformedTransactions || [],
        lastUpdated: wallet.lastUpdated,
        recovered: wallet.recovered,
        usingCachedBalance: true,
        error: serviceError.message,
        note: 'Using cached data. Error communicating with blockchain.',
        blockchain: blockchainStatus
      });
    }
  } catch (error) {
    console.error('Error fetching wallet info:', error);
    res.status(500).json({ 
      error: `Failed to fetch wallet information: ${error.message}`
    });
  }
});

// POST /api/wallet/initialize - Create/initialize user wallet
router.post('/wallet/initialize', authenticate, async (req, res) => {
  try {
    // Override with fixed user ID if needed
    const userId = FIXED_USER_ID || req.user.id;
    
    // Check if user already has a wallet
    let wallet = await findById('wallets.json', userId, 'user');
    
    if (wallet) {
      // If wallet exists, suggest a reset
      return res.status(409).json({
        error: 'Wallet already exists',
        walletId: wallet.walletId,
        suggestion: 'If you want to create a new wallet, first delete the existing one with DELETE /api/wallet/reset'
      });
    }
    
    // Use fixed wallet ID or generate a new one
    const walletId = FIXED_WALLET_ID || `wallet_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    console.log(`Creating wallet with ID: ${walletId}`);
    
    try {
      // Create wallet using wallet service
      const walletInfo = await walletService.createWallet(userId, walletId);
      
      // Store mnemonic securely (in a real app, this would use a secure vault)
      const mnemonic = walletInfo.mnemonic;
      
      // Calculate display balance
      const displayBalance = baseToDisplay(0);
      
      // Create wallet record in database
      wallet = {
        id: uuidv4(),
        user: userId,
        walletId,
        address: walletInfo.address,
        balance: 0,
        displayBalance: displayBalance,
        tokenSymbol: TOKEN_SYMBOL,
        mnemonic: "(securely stored)", // Don't store actual mnemonic in database
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      await create('wallets.json', wallet);
      
      // Update user with wallet address
      const user = await findById('users.json', userId);
      if (user) {
        await update('users.json', userId, {
          walletAddress: walletInfo.address
        });
      }
      
      // Return wallet info (without mnemonic)
      res.status(201).json({
        success: true,
        walletId,
        address: walletInfo.address,
        balance: displayBalance,
        balanceFormatted: formatTokenAmount(displayBalance),
        tokenSymbol: TOKEN_SYMBOL,
        message: 'Wallet created successfully'
      });
    } catch (serviceError) {
      console.error('Error creating wallet via service:', serviceError);
      
      // Generate a deterministic address as fallback
      const address = walletService.generateDeterministicAddress(walletId);
      
      console.log('Using generated address as fallback:', address);
      
      // Calculate display balance
      const displayBalance = baseToDisplay(0);
      
      // Create wallet in database with generated address
      wallet = {
        id: uuidv4(),
        user: userId,
        walletId,
        address: address,
        balance: 0,
        displayBalance: displayBalance,
        tokenSymbol: TOKEN_SYMBOL,
        isGeneratedAddress: true, // Flag as offline generated
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      
      await create('wallets.json', wallet);
      
      // Return success with generated address
      res.status(201).json({ 
        success: true,
        walletId,
        address,
        balance: displayBalance,
        balanceFormatted: formatTokenAmount(displayBalance),
        tokenSymbol: TOKEN_SYMBOL,
        message: 'Wallet created with offline-generated address. Blockchain connection failed.',
        error: serviceError.message
      });
    }
  } catch (error) {
    console.error('Error initializing wallet:', error);
    res.status(500).json({ 
      error: `Failed to initialize wallet: ${error.message}`
    });
  }
});

// GET /api/wallet/transactions - Get transaction history
router.get('/wallet/transactions', authenticate, async (req, res) => {
  try {
    // Override with fixed user ID if needed
    const userId = FIXED_USER_ID || req.user.id;
    
    console.log(`Fetching transaction history for user ${userId}`);
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Create query options
    const queryOptions = {
      filters: {
        $or: [
          { sender: userId },
          { recipient: userId }
        ]
      },
      sort: 'timestamp:desc',
      page: page,
      limit: limit
    };
    
    console.log('Querying transactions with options:', JSON.stringify(queryOptions));
    
    // Query transactions from file storage
    const transactions = await query('transactions.json', queryOptions);
    
    // Transform transactions for client
    const transformedTransactions = await Promise.all(transactions.data.map(async (tx) => {
      // Determine transaction type and other party
      const isSender = tx.sender === userId;
      const otherPartyId = isSender ? tx.recipient : tx.sender;
      let otherPartyName = 'Unknown';
      
      if (otherPartyId) {
        try {
          const otherUser = await findById('users.json', otherPartyId);
          if (otherUser) {
            otherPartyName = otherUser.name;
          }
        } catch (err) {
          console.error(`Error finding user ${otherPartyId}:`, err);
        }
      } else if (tx.description === 'Faucet request') {
        otherPartyName = 'IOTA Faucet';
      }
      
      return {
        id: tx.id,
        type: isSender ? 'payment' : 'deposit',
        amount: tx.amount,
        sender: isSender ? 'You' : otherPartyName,
        recipient: isSender ? otherPartyName : 'You',
        timestamp: tx.timestamp,
        status: tx.status || 'confirmed',
        blockId: tx.transactionId || 'local-tx-' + tx.id.substring(0, 8),
        description: tx.description || ''
      };
    }));
    
    // Return transactions
    res.json({
      transactions: transformedTransactions,
      total: transactions.total,
      page: page,
      limit: limit,
      totalPages: Math.ceil(transactions.total / limit)
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({
      error: 'Failed to fetch transaction history',
      details: error.message
    });
  }
});

// GET /api/wallet/address - Get wallet address
router.get('/wallet/address', authenticate, async (req, res) => {
  try {
    // Override with fixed user ID if needed
    const userId = FIXED_USER_ID || req.user.id;
    
    // Find user's wallet
    let wallet = await findById('wallets.json', userId, 'user');
    
    if (!wallet) {
      return res.status(404).json({ 
        error: 'Wallet not found',
        message: 'Please initialize your wallet first'
      });
    }
    
    // IMPORTANT: First check if we already have an address to prevent blockchain calls if unnecessary
    if (wallet.address) {
      // Use cached address first
      res.status(200).json({
        success: true,
        walletId: wallet.walletId,
        address: wallet.address,
        tokenSymbol: TOKEN_SYMBOL
      });
    }
    
    // Try to get fresh address from blockchain service
    try {
      const address = await walletService.getWalletAddress(wallet.walletId);
      
      // Update wallet address in database if changed
      if (address !== wallet.address) {
        await update('wallets.json', wallet.id, {
          address: address,
          lastUpdated: new Date().toISOString()
        });
        
        wallet.address = address;
      }
      
      res.status(200).json({
        success: true,
        walletId: wallet.walletId,
        address: address,
        tokenSymbol: TOKEN_SYMBOL
      });
    } catch (serviceError) {
      console.error('Error fetching address from blockchain:', serviceError);
      
      // Generate a deterministic address if we don't have one
      if (!wallet.address) {
        // Create a deterministic address based on wallet ID
        const address = walletService.generateDeterministicAddress(wallet.walletId);
        
        console.log(`Generated deterministic address: ${address}`);
        
        // Save this address to avoid future blockchain calls
        await update('wallets.json', wallet.id, {
          address: address,
          lastUpdated: new Date().toISOString(),
          isGeneratedAddress: true
        });
        
        wallet.address = address;
      }
      
      // Return address (either existing or newly generated)
      res.status(200).json({
        success: true,
        walletId: wallet.walletId,
        address: wallet.address,
        tokenSymbol: TOKEN_SYMBOL,
        note: 'Using locally generated address. Live blockchain data currently unavailable.'
      });
    }
  } catch (error) {
    console.error('Error fetching wallet address:', error);
    res.status(500).json({ 
      error: `Failed to fetch wallet address: ${error.message}`
    });
  }
});

// POST /api/wallet/transfer - Transfer tokens
router.post('/wallet/transfer', authenticate, async (req, res) => {
  console.log('[DIAG] Transfer request received');
  
  // Global diagnostics to track the operation
  const diagnostics = {
    startTime: Date.now(),
    steps: [],
    errors: []
  };
  
  // Helper to log steps
  const logStep = (name, success = true, details = null) => {
    const step = { name, success, time: Date.now() - diagnostics.startTime };
    if (details) step.details = details;
    diagnostics.steps.push(step);
    console.log(`[DIAG] ${success ? '✓' : '✗'} ${name}${details ? ': ' + details : ''}`);
  };
  
  try {
    const { recipientAddress, amount, walletId, directTransfer } = req.body;
    
    // Option to use direct transfer bypassing wallet manager
    // This can be helpful if wallet manager is causing issues
    process.env.USE_DIRECT_TRANSFERS = directTransfer === true ? 'true' : 'false';
    
    if (directTransfer === true) {
      logStep('Direct transfer mode enabled', true);
    }
    
    // Override with fixed user ID if needed
    const userId = FIXED_USER_ID || req.user?.id || 'fixed_user_123';
    
    logStep('Request parsed', true, `User: ${userId}, Amount: ${amount}, Recipient: ${recipientAddress}`);
    
    if (!recipientAddress) {
      logStep('Validate recipient', false, 'Missing address');
      return res.status(400).json({ 
        error: 'Recipient address is required',
        diagnostics
      });
    }
    
    // Validate amount - this is in display units
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      logStep('Validate amount', false, `Invalid: ${amount}`);
      return res.status(400).json({ 
        error: 'Amount must be a positive number',
        diagnostics
      });
    }
    
    logStep('Input validation', true);
    
    // Find user's wallet - either use provided wallet ID or find from user record
    let wallet;
    if (walletId) {
      // If wallet ID is explicitly provided, use it
      wallet = await findById('wallets.json', walletId);
      if (!wallet) {
        logStep('Find wallet by ID', false, walletId);
        // Try to find by user ID as fallback
        wallet = await findById('wallets.json', userId, 'user');
      } else {
        logStep('Find wallet by ID', true, walletId);
      }
    } else {
      // Find by user ID
      wallet = await findById('wallets.json', userId, 'user');
      logStep('Find wallet by user ID', wallet ? true : false, userId);
    }
    
    if (!wallet) {
      return res.status(404).json({ 
        error: 'Wallet not found',
        message: 'Please initialize your wallet first',
        diagnostics
      });
    }
    
    logStep('Wallet found', true, `ID: ${wallet.walletId}, Balance: ${wallet.balance}`);
    
    // Find recipient user by address (used for record keeping)
    let recipientUser;
    let recipientUserId = null;
    
    try {
      recipientUser = await findMany('users.json', user => user.walletAddress === recipientAddress);
      recipientUserId = recipientUser.length > 0 ? recipientUser[0].id : null;
      logStep('Find recipient', true, recipientUserId || 'Unknown');
    } catch (userErr) {
      logStep('Find recipient', false, userErr.message);
      // Continue even if we can't find the recipient (non-critical)
    }
    
    // Create a transaction record to track this attempt
    const transactionId = uuidv4();
    const timestamp = new Date().toISOString();
    
    try {
      // Check if we need to convert the amount from display to blockchain units
      const blockchainAmount = displayToBase(transferAmount);
      logStep('Convert amount', true, `Display: ${transferAmount} → Blockchain: ${blockchainAmount}`);
      
      // Create a pending transaction record
      try {
        const pendingTransaction = {
          id: transactionId,
          sender: userId,
          recipient: recipientUserId,
          recipientAddress,
          amount: blockchainAmount, // Store blockchain amount
          displayAmount: transferAmount, // Also store display amount
          tokenSymbol: TOKEN_SYMBOL,
          status: 'pending',
          timestamp,
          note: 'Transaction initiated'
        };
        
        await create('transactions.json', pendingTransaction);
        logStep('Create transaction record', true, transactionId);
      } catch (transactionError) {
        logStep('Create transaction record', false, transactionError.message);
        // Continue even if transaction record creation fails
      }
      
      // Execute transfer using wallet service with enhanced error handling
      logStep('Executing transfer', true, `Amount: ${blockchainAmount}`);
      
      try {
        // Set a timeout for the whole transfer operation
        const transferPromise = walletService.transferTokens(
          wallet.walletId,
          recipientAddress,
          blockchainAmount  // Use blockchain amount for the actual transfer
        );
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Transfer operation timed out after 120 seconds'));
          }, 120000); // 2 minute timeout
        });
        
        // Race the transfer against the timeout
        const transferResult = await Promise.race([transferPromise, timeoutPromise]);
        
        logStep('Transfer completed', true, transferResult.method || 'unknown');
        
        // Update transaction record with success
        try {
          const successTransaction = {
            status: 'confirmed',
            transactionId: transferResult.transactionId,
            blockId: transferResult.blockId,
            completedAt: new Date().toISOString()
          };
          
          await update('transactions.json', transactionId, successTransaction);
          logStep('Update transaction record', true, 'Status: confirmed');
        } catch (updateError) {
          logStep('Update transaction record', false, updateError.message);
          // Continue even if transaction update fails
        }
        
        // Update wallet balance in database
        try {
          const newBalance = transferResult.newBalance || (wallet.balance - blockchainAmount);
          const newDisplayBalance = baseToDisplay(newBalance);
          
          await update('wallets.json', wallet.id, {
            balance: newBalance, // Store raw balance
            displayBalance: newDisplayBalance, // Also store display balance
            lastUpdated: new Date().toISOString()
          });
          logStep('Update wallet balance', true, `New: ${newDisplayBalance} ${TOKEN_SYMBOL}`);
        } catch (updateError) {
          logStep('Update wallet balance', false, updateError.message);
          // Continue even if wallet update fails
        }
        
        // Return success response
        return res.status(200).json({
          success: true,
          message: 'Transfer completed successfully',
          transactionId: transferResult.transactionId || transactionId,
          blockId: transferResult.blockId,
          amount: transferAmount, // Return display amount for consistency
          amountFormatted: formatTokenAmount(transferAmount),
          tokenSymbol: TOKEN_SYMBOL,
          method: transferResult.method || 'standard',
          newBalance: baseToDisplay(transferResult.newBalance || (wallet.balance - blockchainAmount)),
          diagnostics
        });
      } catch (transferError) {
        // Check if it's a timeout error
        if (transferError.message && transferError.message.includes('timed out')) {
          logStep('Transfer timeout', false, transferError.message);
          
          // Update transaction record with timeout status
          try {
            await update('transactions.json', transactionId, {
              status: 'timeout',
              error: 'Operation timed out',
              failedAt: new Date().toISOString()
            });
          } catch (updateError) {
            // Ignore update errors at this point
          }
          
          // Return timeout error
          return res.status(504).json({
            error: 'Transfer operation timed out',
            message: 'The operation took too long to complete. This might indicate network issues.',
            transactionId,
            retryable: true,
            diagnostics
          });
        }
        
        // For other errors, continue to the error handling below
        throw transferError;
      }
    } catch (serviceError) {
      diagnostics.errors.push({
        name: 'ServiceError',
        message: serviceError.message || 'Unknown service error',
        type: serviceError.type || typeof serviceError,
        time: Date.now() - diagnostics.startTime
      });
      
      console.error('[DIAG] Service error:', serviceError);
      
      // Enhanced error handling for insufficient funds with multiple formats
      const insufficientFundsError = 
        (serviceError.type === 'insufficientFunds') ||
        (serviceError.error && typeof serviceError.error === 'string' && serviceError.error.includes('insufficient')) ||
        (serviceError.message && typeof serviceError.message === 'string' && serviceError.message.includes('insufficient'));
      
      if (insufficientFundsError) {
        logStep('Error classification', true, 'Insufficient funds');
        
        // Update transaction record with failure
        try {
          await update('transactions.json', transactionId, {
            status: 'failed',
            error: 'Insufficient funds',
            failedAt: new Date().toISOString()
          });
        } catch (updateError) {
          // Ignore update errors at this point
        }
        
        return res.status(400).json({
          error: 'Insufficient balance',
          details: serviceError.error || serviceError.message || 'Not enough funds to complete this transaction',
          tokenSymbol: TOKEN_SYMBOL,
          transactionId: transactionId,
          diagnostics
        });
      }
      
      // Network error handling
      const networkError = 
        (serviceError.type === 'networkError') ||
        (serviceError.error && typeof serviceError.error === 'string' && 
         (serviceError.error.includes('Network') || serviceError.error.includes('connection'))) ||
        (serviceError.message && typeof serviceError.message === 'string' && 
         (serviceError.message.includes('Network') || serviceError.message.includes('connection')));
      
      if (networkError) {
        logStep('Error classification', true, 'Network error');
        
        // Update transaction record with failure
        try {
          await update('transactions.json', transactionId, {
            status: 'failed',
            error: 'Network connection error',
            failedAt: new Date().toISOString()
          });
        } catch (updateError) {
          // Ignore update errors at this point
        }
        
        // Offer the direct transfer option
        return res.status(503).json({
          error: 'Network connection error',
          details: 'Could not connect to IOTA network. Please try again with direct transfer mode.',
          transactionId: transactionId,
          tryDirectTransfer: true, // Suggest using direct transfer
          retryable: true,
          diagnostics
        });
      }
      
      // AccountManager creation failure
      const managerError = 
        (serviceError.message && serviceError.message.includes('AccountManager')) ||
        (serviceError.error && serviceError.error.includes('AccountManager'));
      
      if (managerError) {
        logStep('Error classification', true, 'AccountManager error');
        
        // Update transaction record with failure
        try {
          await update('transactions.json', transactionId, {
            status: 'failed',
            error: 'Wallet manager error',
            failedAt: new Date().toISOString()
          });
        } catch (updateError) {
          // Ignore update errors at this point
        }
        
        // Offer the direct transfer option
        return res.status(500).json({
          error: 'Wallet manager error',
          details: 'There was an error initializing the wallet. Please try again with direct transfer mode.',
          transactionId: transactionId,
          tryDirectTransfer: true, // Suggest using direct transfer
          retryable: true,
          diagnostics
        });
      }
      
      // For all other errors, create/update failed transaction record
      const errorDetails = serviceError.error || serviceError.message || JSON.stringify(serviceError);
      logStep('Error classification', true, 'Other error');
      
      try {
        await update('transactions.json', transactionId, {
          status: 'failed',
          error: errorDetails,
          failedAt: new Date().toISOString()
        });
      } catch (updateError) {
        // Ignore update errors at this point
      }
      
      // Return detailed error
      return res.status(500).json({
        error: 'Transfer failed',
        details: errorDetails,
        transactionId: transactionId,
        tokenSymbol: TOKEN_SYMBOL,
        diagnostics
      });
    }
  } catch (error) {
    // Fatal error handling
    diagnostics.errors.push({
      name: 'FatalError',
      message: error.message || 'Unknown error',
      stack: error.stack,
      time: Date.now() - diagnostics.startTime
    });
    
    console.error('[DIAG] Fatal error in transfer route:', error);
    
    res.status(500).json({ 
      error: `Failed to process transfer: ${error.message || JSON.stringify(error)}`,
      diagnostics
    });
  }
});

// POST /api/wallet/request-tokens - Request tokens from faucet
router.post('/wallet/request-tokens', authenticate, async (req, res) => {
  try {
    // Override with fixed user ID if needed
    const userId = FIXED_USER_ID || req.user.id;
    const { amount = 100 } = req.body;
    
    // Parse the amount as a number
    const requestAmount = parseFloat(amount);
    
    console.log(`Requesting ${requestAmount} ${TOKEN_SYMBOL} tokens for user ${userId}`);
    
    // Find user's wallet
    let wallet = await findById('wallets.json', userId, 'user');
    
    if (!wallet) {
      return res.status(404).json({ 
        error: 'Wallet not found',
        message: 'Please initialize your wallet first'
      });
    }
    
    // Request tokens from faucet using wallet service (pass the display amount)
    try {
      const faucetResult = await walletService.requestFaucetTokens(wallet.walletId, requestAmount);
      console.log('Faucet request result:', faucetResult);
      
      // Check if this is a fallback/offline response
      const isFallback = faucetResult.status === 'offline_fallback';
      
      // Use the amount that was actually received
      const actualBlockchainAmount = faucetResult.amount;
      const actualDisplayAmount = faucetResult.displayAmount;
      
      // Create transaction record
      const transaction = {
        id: uuidv4(),
        sender: null, // Faucet
        recipient: userId,
        recipientAddress: wallet.address,
        amount: actualBlockchainAmount, // Store the actual blockchain amount
        displayAmount: actualDisplayAmount, // Store the actual display amount
        requestedAmount: requestAmount, // Also store the originally requested amount
        status: isFallback ? 'pending' : (faucetResult.status || 'pending'),
        timestamp: new Date().toISOString(),
        description: isFallback ? 'Local Faucet (Network Error Fallback)' : 'Testnet Faucet Request',
        transactionId: faucetResult.transaction_id || `faucet-${Date.now()}`,
        blockId: faucetResult.block_id || null,
        tokenSymbol: TOKEN_SYMBOL
      };
      
      await create('transactions.json', transaction);
      
      // Calculate new balances using the actual amount received
      const newBlockchainBalance = (wallet.balance || 0) + actualBlockchainAmount;
      const newDisplayBalance = baseToDisplay(newBlockchainBalance);
      
      // Update wallet balance
      await update('wallets.json', wallet.id, {
        balance: newBlockchainBalance,
        displayBalance: newDisplayBalance,
        lastFaucetRequest: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`Updated balance after faucet request: ${newDisplayBalance} ${TOKEN_SYMBOL}`);
      
      // Prepare response
      const response = {
        success: true,
        message: isFallback
          ? `${actualDisplayAmount} ${TOKEN_SYMBOL} have been added to your wallet!`
          : `${actualDisplayAmount} ${TOKEN_SYMBOL} have been received from the testnet faucet!`,
        requestedAmount: requestAmount,
        receivedAmount: actualDisplayAmount,
        // Include both requested and actual amounts in case they differ
        requestedAmountFormatted: formatTokenAmount(requestAmount),
        receivedAmountFormatted: formatTokenAmount(actualDisplayAmount),
        balance: newDisplayBalance,
        balanceFormatted: formatTokenAmount(newDisplayBalance),
        tokenSymbol: TOKEN_SYMBOL,
        transaction: transaction.id,
        faucetResponse: faucetResult
      };
      
      // Add warning if using fallback
      if (isFallback && faucetResult.message) {
        response.warning = "Using local simulation due to network connectivity issues";
        response.error = faucetResult.message;
      }
      
      // Add notice if the received amount is different from the requested amount
      if (Math.abs(actualDisplayAmount - requestAmount) > 0.001) {
        response.notice = `The faucet sent ${actualDisplayAmount} ${TOKEN_SYMBOL} instead of the requested ${requestAmount} ${TOKEN_SYMBOL}`;
      }
      
      res.status(200).json(response);
      
      // Schedule a delayed balance check for faucet tokens
      if (!isFallback) {
        setTimeout(async () => {
          try {
            console.log("Checking for faucet tokens...");
            const walletInfo = await walletService.syncWallet(wallet.walletId);
            
            // Convert blockchain balance to display balance
            const displayBalance = baseToDisplay(walletInfo.balance);
            
            if (walletInfo.balance !== newBlockchainBalance) {
              await update('wallets.json', wallet.id, {
                balance: walletInfo.balance,
                displayBalance: displayBalance,
                lastUpdated: new Date().toISOString()
              });
              console.log(`Updated balance after faucet check: ${displayBalance} ${TOKEN_SYMBOL}`);
            }
          } catch (error) {
            console.error("Error syncing wallet after faucet request:", error);
          }
        }, 30000); // Check after 30 seconds
      }
    } catch (faucetError) {
      console.error('Error requesting tokens from faucet:', faucetError);
      
      // FALLBACK: If real faucet fails, use local simulation
      console.log('Falling back to local token simulation');
      
      // Convert the display amount to blockchain amount
      const blockchainAmount = displayToBase(requestAmount);
      
      // Create transaction record
      const transaction = {
        id: uuidv4(),
        sender: null, // Faucet
        recipient: userId,
        recipientAddress: wallet.address,
        amount: blockchainAmount,
        displayAmount: requestAmount,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
        description: 'Local faucet simulation (faucet error fallback)',
        transactionId: `local-faucet-${Date.now()}`,
        tokenSymbol: TOKEN_SYMBOL
      };
      
      await create('transactions.json', transaction);
      
      // Calculate new balances - use exactly the requested amount for fallback
      const newBlockchainBalance = (wallet.balance || 0) + blockchainAmount;
      const newDisplayBalance = baseToDisplay(newBlockchainBalance);
      
      // Update wallet balance locally
      await update('wallets.json', wallet.id, {
        balance: newBlockchainBalance,
        displayBalance: newDisplayBalance,
        lastFaucetRequest: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });
      
      console.log(`Updated balance after local faucet simulation: ${newDisplayBalance} ${TOKEN_SYMBOL}`);
      
      res.status(200).json({
        success: true,
        message: `${requestAmount} ${TOKEN_SYMBOL} have been added to your wallet!`,
        balance: newDisplayBalance,
        balanceFormatted: formatTokenAmount(newDisplayBalance),
        tokenSymbol: TOKEN_SYMBOL,
        transaction: transaction.id,
        warning: "Using local simulation because faucet request failed",
        error: faucetError.message
      });
    }
  } catch (error) {
    console.error('Error processing faucet request:', error);
    res.status(500).json({ 
      error: `Failed to process token request: ${error.message}`
    });
  }
});

// POST /api/wallet/sync - Force sync wallet with blockchain
router.post('/wallet/sync', authenticate, async (req, res) => {
  try {
    // Override with fixed user ID if needed
    const userId = FIXED_USER_ID || req.user.id;
    
    console.log(`Syncing wallet for user ${userId} with blockchain`);
    
    // Find user's wallet
    let wallet = await findById('wallets.json', userId, 'user');
    
    if (!wallet) {
      return res.status(404).json({ 
        error: 'Wallet not found',
        message: 'Please initialize your wallet first'
      });
    }
    
    // Sync wallet with blockchain
    try {
      const walletInfo = await walletService.syncWallet(wallet.walletId);
      
      // Convert from blockchain units to display units
      const previousDisplayBalance = baseToDisplay(wallet.balance || 0);
      const newDisplayBalance = baseToDisplay(walletInfo.balance);
      
      // Update wallet balance in database
      await update('wallets.json', wallet.id, {
        balance: walletInfo.balance, // Store raw balance
        displayBalance: newDisplayBalance, // Also store display balance
        address: walletInfo.address,
        lastUpdated: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: 'Wallet synchronized with blockchain',
        previousBalance: previousDisplayBalance,
        newBalance: newDisplayBalance,
        balanceFormatted: formatTokenAmount(newDisplayBalance),
        tokenSymbol: TOKEN_SYMBOL,
        changed: wallet.balance !== walletInfo.balance
      });
    } catch (serviceError) {
      console.error('Error syncing wallet:', serviceError);
      
      // Convert stored balance to display balance for consistency
      const displayBalance = baseToDisplay(wallet.balance || 0);
      
      // Return a successful response with cached data
      res.status(200).json({
        success: true,
        message: 'Could not sync with blockchain due to connection issue',
        previousBalance: displayBalance,
        newBalance: displayBalance,
        balanceFormatted: formatTokenAmount(displayBalance),
        tokenSymbol: TOKEN_SYMBOL,
        changed: false,
        error: serviceError.message
      });
    }
  } catch (error) {
    console.error('Error syncing wallet:', error);
    res.status(500).json({
      error: 'Failed to sync wallet',
      details: error.message
    });
  }
});

// DELETE /api/wallet/reset - Delete existing wallet to start fresh
router.delete('/wallet/reset', authenticate, async (req, res) => {
  try {
    // Override with fixed user ID if needed
    const userId = FIXED_USER_ID || req.user.id;
    
    // Find user's wallet
    const wallet = await findById('wallets.json', userId, 'user');
    
    if (wallet) {
      // Delete wallet from blockchain service
      try {
        await walletService.deleteWallet(wallet.walletId);
      } catch (serviceError) {
        console.error('Error deleting wallet from blockchain:', serviceError);
        // Continue with local delete even if blockchain delete fails
      }
      
      // Remove from database
      await remove('wallets.json', wallet.id);
      
      // Remove associated transactions
      const txs = await query('transactions.json', {
        filters: {
          $or: [
            { sender: userId },
            { recipient: userId }
          ]
        }
      });
      
      for (const tx of txs.data) {
        await remove('transactions.json', tx.id);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Wallet reset successful. You can now create a new wallet.'
    });
  } catch (error) {
    console.error('Error resetting wallet:', error);
    res.status(500).json({
      error: 'Failed to reset wallet',
      details: error.message
    });
  }
});

module.exports = router;