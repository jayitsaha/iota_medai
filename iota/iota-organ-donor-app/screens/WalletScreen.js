import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, RefreshControl, TouchableOpacity, Clipboard, Share, Alert } from 'react-native';
import { Card, Title, Paragraph, Text, Button, Divider, List, Avatar, Chip, ActivityIndicator, Snackbar, Banner } from 'react-native-paper';
import { useWallet } from '../services/walletService';

export default function WalletScreen({ navigation }) {
  const { 
    balance, 
    address, 
    transactions, 
    loading, 
    error,
    blockchainStatus, // Use blockchain status from wallet service
    getBalance, 
    getTransactionHistory,
    refreshWallet,
    resetAndCreateWallet,
    requestTokens,
    syncWallet // Added sync function
  } = useWallet();
  
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [faucetButtonDisabled, setFaucetButtonDisabled] = useState(false);
  const [walletRecoveryVisible, setWalletRecoveryVisible] = useState(false);

  useEffect(() => {
    loadWalletData();
  }, []);

  useEffect(() => {
    // Show error message in snackbar if there is one
    if (error) {
      // Check if this is a "stronghold not found" error
      if (error.includes('Stronghold file not found') || 
          error.includes('wallet not found') ||
          error.includes('missing wallet')) {
        setWalletRecoveryVisible(true);
      }
      
      setSnackbarMessage(error);
      setSnackbarVisible(true);
    }
  }, [error]);

  const loadWalletData = async () => {
    try {
      await getBalance();
      await getTransactionHistory();
    } catch (err) {
      console.error('Error loading wallet data:', err);
      
      // Check if this is a "stronghold not found" error
      if (err.message && (
          err.message.includes('Stronghold file not found') || 
          err.message.includes('wallet not found') ||
          err.message.includes('missing wallet'))) {
        setWalletRecoveryVisible(true);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Try to sync, but fall back to just getting balance and transactions if sync fails
      try {
        await syncWallet();
      } catch (syncErr) {
        console.log('Sync failed, falling back to basic refresh:', syncErr);
        // If sync fails, just get balance and transactions directly
        await getBalance();
        await getTransactionHistory();
      }
    } catch (err) {
      console.error('Error refreshing wallet data:', err);
      setSnackbarMessage('Could not refresh wallet data');
      setSnackbarVisible(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleWalletRecovery = async () => {
    Alert.alert(
      "Recover Wallet",
      "We'll reset your wallet and create a new one. This will keep your existing wallet ID but create a fresh blockchain wallet. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Reset & Recover", 
          onPress: async () => {
            try {
              setSnackbarMessage("Recovering wallet...");
              setSnackbarVisible(true);
              await resetAndCreateWallet();
              setWalletRecoveryVisible(false);
              setSnackbarMessage("Wallet recovered successfully!");
              setSnackbarVisible(true);
            } catch (err) {
              console.error("Recovery failed:", err);
              setSnackbarMessage("Recovery failed: " + err.message);
              setSnackbarVisible(true);
            }
          }
        }
      ]
    );
  };

  const copyAddressToClipboard = () => {
    if (address) {
      Clipboard.setString(address);
      setSnackbarMessage('Address copied to clipboard');
      setSnackbarVisible(true);
    }
  };

  const shareAddress = async () => {
    if (address) {
      try {
        await Share.share({
          message: `My IOTA address for healthcare payments: ${address}`,
          title: 'My IOTA Wallet Address'
        });
      } catch (error) {
        console.log('Error sharing address:', error);
      }
    }
  };

  // Modified to remove rate limit
  const handleRequestTokens = async () => {
    try {
      // Set button disabled during the request
      setFaucetButtonDisabled(true);
      setSnackbarMessage('Requesting tokens from testnet faucet...');
      setSnackbarVisible(true);
      
      const result = await requestTokens(100);
      
      // Check if this was a fallback or real faucet request
      if (result.warning) {
        // This was a fallback local simulation
        setSnackbarMessage(`${result.message} (Local simulation - faucet unavailable)`);
        Alert.alert(
          'Local Tokens Added',
          `100 MEDAI tokens have been added to your wallet locally.\n\nNote: The real faucet was unavailable (${result.error || 'unknown error'}), so tokens were added locally instead.`
        );
      } else if (result.faucetResponse) {
        // This was a real faucet request
        setSnackbarMessage('Tokens requested from testnet faucet! They will arrive shortly.');
        Alert.alert(
          'Faucet Request Submitted',
          'Your request for 100 MEDAI tokens has been submitted to the testnet faucet. They should appear in your wallet within a few minutes.',
          [
            { text: 'OK' }
          ]
        );
      } else {
        // Generic success
        setSnackbarMessage(result.message || 'Tokens requested successfully');
      }
      
      setSnackbarVisible(true);
      
      // Re-enable button with a small delay to prevent spam
      setTimeout(() => {
        setFaucetButtonDisabled(false);
      }, 3000);
    } catch (err) {
      console.error('Error requesting tokens:', err);
      setSnackbarMessage(err.message || 'Failed to request tokens');
      setSnackbarVisible(true);
      
      Alert.alert(
        'Error Requesting Tokens',
        err.message || 'There was an error requesting tokens. Please try again later.'
      );
      
      // Re-enable the button on error
      setFaucetButtonDisabled(false);
    }
  };

  const renderTransactionItem = ({ item }) => {
    const isPayment = item.type === 'payment';
    const isDeposit = item.type === 'deposit';
    
    return (
      <Card style={styles.transactionCard}>
        <Card.Content>
          <View style={styles.transactionHeader}>
            <View style={styles.transactionTypeContainer}>
              <Avatar.Icon 
                size={40} 
                icon={isPayment ? 'arrow-up' : 'arrow-down'} 
                style={{
                  backgroundColor: isPayment ? '#ffcdd2' : '#c8e6c9'
                }}
              />
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>
                  {isPayment ? 'Payment to' : 'Deposit from'}
                </Text>
                <Text numberOfLines={1} style={styles.transactionParty}>
                  {isPayment ? item.recipient : item.sender}
                </Text>
              </View>
            </View>
            <Text style={[
              styles.transactionAmount,
              { color: isPayment ? '#d32f2f' : '#388e3c' }
            ]}>
              {isPayment ? '-' : '+'}{item.amount} MEDAI
            </Text>
          </View>
          
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionDate}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
            <Chip 
              style={[
                styles.statusChip,
                { backgroundColor: item.status === 'confirmed' ? '#e8f5e9' : '#fff8e1' }
              ]}
              size={20}
            >
              {item.status}
            </Chip>
          </View>
          
          {item.blockId && (
            <TouchableOpacity onPress={() => {
              Clipboard.setString(item.blockId);
              setSnackbarMessage('Transaction ID copied to clipboard');
              setSnackbarVisible(true);
            }}>
              <Text style={styles.blockId} numberOfLines={1} ellipsizeMode="middle">
                TX ID: {item.blockId}
              </Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your wallet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Wallet Recovery Banner */}
      {walletRecoveryVisible && (
        <Banner
          visible={walletRecoveryVisible}
          actions={[
            {
              label: 'Recover Now',
              onPress: handleWalletRecovery,
              mode: 'contained',
            },
            {
              label: 'Dismiss',
              onPress: () => setWalletRecoveryVisible(false),
            },
          ]}
          icon="alert"
        >
          Wallet file not found. Your wallet may need to be recovered.
        </Banner>
      )}
      
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Blockchain Status Card */}
        {blockchainStatus && (
          <Card style={styles.blockchainCard}>
            <Card.Content>
              <Title style={styles.blockchainTitle}>Blockchain Status</Title>
              <View style={styles.blockchainInfo}>
                <Text style={styles.blockchainLabel}>Network:</Text>
                <Text style={styles.blockchainValue}>{blockchainStatus.network}</Text>
              </View>
              <View style={styles.blockchainInfo}>
                <Text style={styles.blockchainLabel}>Status:</Text>
                <Chip 
                  style={{ backgroundColor: blockchainStatus.status === 'Connected' ? '#e8f5e9' : '#ffebee' }}
                  size={20}
                >
                  {blockchainStatus.status}
                </Chip>
              </View>
              <View style={styles.blockchainInfo}>
                <Text style={styles.blockchainLabel}>Last Block:</Text>
                <Text style={styles.blockchainValue} numberOfLines={1} ellipsizeMode="middle">
                  {blockchainStatus.lastBlockId}
                </Text>
              </View>
              <View style={styles.blockchainInfo}>
                <Text style={styles.blockchainLabel}>Last Update:</Text>
                <Text style={styles.blockchainValue}>
                  {new Date(blockchainStatus.time).toLocaleString()}
                </Text>
              </View>
              <View style={styles.blockchainInfo}>
                <Text style={styles.blockchainLabel}>Wallet ID:</Text>
                <Text style={styles.blockchainValue}>
                  {blockchainStatus.walletId || 'fixed_wallet_123'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                syncWallet().catch(err => {
                  console.error("Sync error:", err);
                  setSnackbarMessage("Sync failed: " + (err.message || "Unknown error"));
                  setSnackbarVisible(true);
                  
                  // Check if this is a "stronghold not found" error
                  if (err.message && (
                      err.message.includes('Stronghold file not found') || 
                      err.message.includes('wallet not found') ||
                      err.message.includes('missing wallet'))) {
                    setWalletRecoveryVisible(true);
                  }
                });
                setSnackbarMessage('Syncing with blockchain...');
                setSnackbarVisible(true);
              }}>
                <View style={styles.syncButton}>
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </View>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.balanceCard}>
          <Card.Content>
            <Title style={styles.balanceTitle}>Your MEDAI Balance</Title>
            <Text style={styles.balanceAmount}>{balance} MEDAI</Text>
            <Text style={styles.balanceSubtitle}>
              For healthcare services payments
            </Text>
            
            <View style={styles.buttonContainer}>
              <Button 
                mode="contained" 
                icon="shopping" 
                onPress={() => navigation.navigate('Market')}
                style={styles.marketplaceButton}
              >
                Shop Healthcare Services
              </Button>
              <Button 
                mode="contained" 
                icon="cash-plus" 
                onPress={() => navigation.navigate('AddFunds')}
                style={[styles.addFundsButton, { marginTop: 8 }]}
                color="#4CAF50"
              >
                Add Funds
              </Button>
              
              {/* Faucet request button - no rate limit */}
              <Button 
                mode="outlined" 
                icon="water" 
                onPress={handleRequestTokens}
                style={{ marginTop: 8 }}
                disabled={faucetButtonDisabled}
              >
                Request 100 Free Tokens
              </Button>
              
              {/* Reset wallet button */}
              <Button 
                mode="outlined" 
                icon="refresh" 
                onPress={handleWalletRecovery}
                style={{ marginTop: 8 }}
                color="#FF9800"
              >
                Reset & Recover Wallet
              </Button>
            </View>
          </Card.Content>
        </Card>
        
        <Card style={styles.addressCard}>
          <Card.Content>
            <Title style={styles.addressTitle}>Your IOTA Address</Title>
            <TouchableOpacity onPress={copyAddressToClipboard}>
              <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
                {address}
              </Text>
            </TouchableOpacity>
            <Text style={styles.addressHelper}>Tap address to copy</Text>
            
            <View style={styles.addressActions}>
              <Button 
                mode="outlined"
                icon="content-copy"
                onPress={copyAddressToClipboard}
                style={styles.addressButton}
              >
                Copy
              </Button>
              <Button 
                mode="outlined"
                icon="share-variant"
                onPress={shareAddress}
                style={styles.addressButton}
              >
                Share
              </Button>
            </View>
            
            {/* Wallet ID Information */}
            <View style={styles.walletIdContainer}>
              <Text style={styles.walletIdLabel}>Wallet ID: fixed_wallet_123</Text>
              <Text style={styles.walletIdLabel}>User ID: fixed_user_123</Text>
            </View>
          </Card.Content>
        </Card>
        
        <View style={styles.transactionsHeader}>
          <Title style={styles.transactionsTitle}>Transaction History</Title>
        </View>
        
        {transactions.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>
                No transactions yet. Book a service to see your first transaction!
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.transactionsList}
          />
        )}
      </ScrollView>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  // Blockchain card styles
  blockchainCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 4,
    backgroundColor: '#f9f9ff',
  },
  blockchainTitle: {
    fontSize: 18,
    marginBottom: 12,
    color: '#3f51b5',
  },
  blockchainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  blockchainLabel: {
    fontWeight: 'bold',
    color: '#555',
  },
  blockchainValue: {
    maxWidth: '70%',
    color: '#333',
  },
  syncButton: {
    backgroundColor: '#3f51b5',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  balanceCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 4,
  },
  balanceTitle: {
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 8,
  },
  balanceAmount: {
    textAlign: 'center',
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  balanceSubtitle: {
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },
  buttonContainer: {
    marginTop: 8,
  },
  marketplaceButton: {
    paddingVertical: 8,
  },
  addressCard: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  addressTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  addressText: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  addressHelper: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  addressButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  // Wallet ID styles
  walletIdContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  walletIdLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  transactionsHeader: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  transactionsTitle: {
    fontSize: 20,
  },
  transactionsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  transactionCard: {
    marginBottom: 8,
    elevation: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionInfo: {
    marginLeft: 12,
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    color: '#666',
  },
  transactionParty: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  statusChip: {
    height: 24,
  },
  blockId: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#0d47a1',
    marginTop: 8,
    padding: 4,
    backgroundColor: '#e3f2fd',
    borderRadius: 4,
  },
  emptyCard: {
    margin: 16,
    marginTop: 0,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
});