import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Alert,
  Clipboard
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWallet } from '../../services/walletService';
import theme from '../../constants/theme';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const WalletScreen = ({ navigation }) => {
  const { 
    balance, 
    address, 
    transactions, 
    loading, 
    error,
    blockchainStatus,
    getBalance, 
    getTransactionHistory,
    refreshWallet,
    resetAndCreateWallet,
    requestTokens,
    syncWallet
  } = useWallet();
  
  const [userName, setUserName] = useState('User');
  const [refreshing, setRefreshing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [faucetButtonDisabled, setFaucetButtonDisabled] = useState(false);
  const [walletRecoveryVisible, setWalletRecoveryVisible] = useState(false);

  // const fadeAnim = useRef(new Value(0)).current;
  useEffect(() => {
    loadUserData();
    loadWalletData();
    
    // Animate components on mount
    // timing(fadeAnim, {
    //   toValue: 1,
    //   duration: 1000,
    //   useNativeDriver: true,
    // }).start();
    
    return () => {
      // Clean up
    };
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

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('user_name');
      if (name) {
        setUserName(name);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

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
          message: `My MEDAI address for healthcare payments: ${address}`,
          title: 'My MEDAI Wallet Address'
        });
      } catch (error) {
        console.log('Error sharing address:', error);
      }
    }
  };

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
      <TouchableOpacity 
        style={styles.transactionCard}
        onPress={() => {
          if (item.blockId) {
            Clipboard.setString(item.blockId);
            setSnackbarMessage('Transaction ID copied to clipboard');
            setSnackbarVisible(true);
          }
        }}
      >
        <LinearGradient
          colors={isPayment ? ['#FFE0E0', '#FFCDD2'] : ['#E0F2E9', '#C8E6C9']}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.transactionGradient}
        >
          <View style={styles.transactionHeader}>
            <View style={styles.transactionIconContainer}>
              <View style={[
                styles.transactionIconCircle,
                {backgroundColor: isPayment ? '#FF8A80' : '#81C784'}
              ]}>
                <Ionicons 
                  name={isPayment ? 'arrow-up' : 'arrow-down'} 
                  size={20} 
                  color="white" 
                />
              </View>
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
              { color: isPayment ? '#D32F2F' : '#388E3C' }
            ]}>
              {isPayment ? '-' : '+'}{item.amount} MEDAI
            </Text>
          </View>
          
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionDate}>
              {new Date(item.timestamp).toLocaleString()}
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: item.status === 'confirmed' ? '#E8F5E9' : '#FFF8E1' }
            ]}>
              <Text style={[
                styles.statusText,
                { color: item.status === 'confirmed' ? '#388E3C' : '#FFA000' }
              ]}>
                {item.status}
              </Text>
            </View>
          </View>
          
          {item.blockId && (
            <View style={styles.blockIdContainer}>
              <Text style={styles.blockIdLabel}>TX ID:</Text>
              <Text style={styles.blockIdText} numberOfLines={1} ellipsizeMode="middle">
                {item.blockId}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="wallet" size={48} color={theme.colors.accent.alzheimers.main} />
        <Text style={styles.loadingText}>Loading your wallet...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      {/* Wallet Recovery Banner */}
      {walletRecoveryVisible && (
        <View style={styles.recoveryBanner}>
          <View style={styles.recoveryBannerContent}>
            <Ionicons name="alert-circle" size={24} color="#FFA000" />
            <Text style={styles.recoveryBannerText}>
              Wallet file not found. Your wallet may need to be recovered.
            </Text>
          </View>
          <View style={styles.recoveryBannerActions}>
            <TouchableOpacity 
              style={styles.recoveryBannerButton}
              onPress={handleWalletRecovery}
            >
              <Text style={styles.recoveryBannerButtonText}>Recover Now</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setWalletRecoveryVisible(false)}
              style={styles.recoveryBannerDismiss}
            >
              <Text style={styles.recoveryBannerDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent.alzheimers.main]}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Hello, {userName}</Text>
              <Text style={styles.pageTitle}>My Wallet</Text>
              <Text style={styles.pageSubtitle}>Manage your MEDAI tokens securely</Text>
            </View>
          </View>
        </View>

        {/* Balance Card */}
        <View 
          style={[
            styles.balanceCardContainer, 
           
          ]}
        >
          <LinearGradient
            colors={[theme.colors.accent.alzheimers.light, theme.colors.accent.alzheimers.main]}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.balanceCard}
          >
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceTitle}>Your MEDAI Balance</Text>
              <TouchableOpacity 
                style={styles.syncButton}
                onPress={() => {
                  syncWallet().catch(err => {
                    console.error("Sync error:", err);
                    setSnackbarMessage("Sync failed: " + (err.message || "Unknown error"));
                    setSnackbarVisible(true);
                  });
                  setSnackbarMessage('Syncing with blockchain...');
                  setSnackbarVisible(true);
                }}
              >
                <Ionicons name="sync" size={20} color="white" />
                <Text style={styles.syncButtonText}>Sync</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>{balance} MEDAI</Text>
            <Text style={styles.balanceSubtitle}>For healthcare services payments</Text>
            
            <View style={styles.balanceActions}>
              <TouchableOpacity 
                style={styles.balanceActionButton}
                onPress={() => navigation.navigate('Market')}
              >
                <Ionicons name="cart" size={20} color="white" />
                <Text style={styles.balanceActionText}>Shop Services</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.balanceActionButton}
                onPress={() => navigation.navigate('AddFunds')}
              >
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.balanceActionText}>Add Funds</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Address Card */}
        <View 
          style={[
            styles.addressCardContainer, 
            
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Your MEDAI Address</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addressContainer}
            onPress={copyAddressToClipboard}
          >
            <Text style={styles.addressText} numberOfLines={1} ellipsizeMode="middle">
              {address || 'Loading address...'}
            </Text>
            <Ionicons name="copy-outline" size={20} color={theme.colors.accent.alzheimers.main} />
          </TouchableOpacity>
          
          <Text style={styles.addressHelper}>Tap address to copy to clipboard</Text>
          
          <View style={styles.addressActions}>
            <TouchableOpacity 
              style={styles.addressActionButton}
              onPress={copyAddressToClipboard}
            >
              <Ionicons name="copy" size={20} color={theme.colors.accent.alzheimers.main} />
              <Text style={styles.addressActionText}>Copy</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.addressActionButton}
              onPress={shareAddress}
            >
              <Ionicons name="share-social" size={20} color={theme.colors.accent.alzheimers.main} />
              <Text style={styles.addressActionText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Blockchain Status Card */}
        {blockchainStatus && (
          <View 
            style={[
              styles.blockchainCardContainer, 
              
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Blockchain Status</Text>
            </View>
            
            <View style={styles.blockchainInfoContainer}>
              <View style={styles.blockchainInfoRow}>
                <Text style={styles.blockchainInfoLabel}>Network:</Text>
                <Text style={styles.blockchainInfoValue}>{blockchainStatus.network}</Text>
              </View>
              
              <View style={styles.blockchainInfoRow}>
                <Text style={styles.blockchainInfoLabel}>Status:</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: blockchainStatus.status === 'Connected' ? '#E8F5E9' : '#FFEBEE' }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: blockchainStatus.status === 'Connected' ? '#388E3C' : '#D32F2F' }
                  ]}>
                    {blockchainStatus.status}
                  </Text>
                </View>
              </View>
              
              <View style={styles.blockchainInfoRow}>
                <Text style={styles.blockchainInfoLabel}>Last Updated:</Text>
                <Text style={styles.blockchainInfoValue}>
                  {new Date(blockchainStatus.time).toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Request Free Tokens */}
        <View 
          style={[
            styles.freeTokensContainer, 
            
          ]}
        >
          <TouchableOpacity 
            style={[
              styles.freeTokensButton,
              faucetButtonDisabled && styles.freeTokensButtonDisabled
            ]}
            onPress={handleRequestTokens}
            disabled={faucetButtonDisabled}
          >
            <LinearGradient
              colors={faucetButtonDisabled ? ['#CCCCCC', '#AAAAAA'] : ['#4CAF50', '#388E3C']}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.freeTokensGradient}
            >
              <Ionicons name="water" size={24} color="white" />
              <Text style={styles.freeTokensText}>Request 100 Free Tokens</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.resetWalletButton}
            onPress={handleWalletRecovery}
          >
            <View style={styles.resetWalletContent}>
              <Ionicons name="refresh" size={18} color="#FF9800" />
              <Text style={styles.resetWalletText}>Reset & Recover Wallet</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View 
          style={[
            styles.transactionsContainer, 
            
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Transaction History</Text>
          </View>
          
          {transactions.length === 0 ? (
            <View style={styles.emptyTransactionsContainer}>
              <Ionicons name="time" size={48} color="#DDD" />
              <Text style={styles.emptyTransactionsText}>
                No transactions yet. Request tokens or book a service to see your first transaction!
              </Text>
            </View>
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTransactionItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.transactionsList}
            />
          )}
        </View>
      </ScrollView>
      
      {/* Snackbar */}
      {snackbarVisible && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
          <TouchableOpacity onPress={() => setSnackbarVisible(false)}>
            <Ionicons name="close" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  recoveryBanner: {
    backgroundColor: '#FFF8E1',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  recoveryBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recoveryBannerText: {
    flex: 1,
    marginLeft: 10,
    color: '#795548',
  },
  recoveryBannerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  recoveryBannerButton: {
    backgroundColor: '#FFA000',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginRight: 10,
  },
  recoveryBannerButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  recoveryBannerDismiss: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  recoveryBannerDismissText: {
    color: '#795548',
  },
  header: {
    paddingTop: StatusBar.currentHeight + 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  balanceCardContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  syncButtonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  balanceSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  balanceActionText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
  addressCardContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginHorizontal: 20,
  },
  cardHeader: {
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 5,
  },
  addressText: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
    marginRight: 10,
  },
  addressHelper: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
  },
  addressActions: {
    flexDirection: 'row',
  },
  addressActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  addressActionText: {
    color: theme.colors.accent.alzheimers.main,
    marginLeft: 8,
    fontWeight: '500',
  },
  blockchainCardContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginHorizontal: 20,
  },
  blockchainInfoContainer: {
    backgroundColor: '#F9F9FF',
    borderRadius: 10,
    padding: 15,
  },
  blockchainInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  blockchainInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  blockchainInfoValue: {
    fontSize: 14,
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  freeTokensContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  freeTokensButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  freeTokensButtonDisabled: {
    opacity: 0.7,
  },
  freeTokensGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  freeTokensText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resetWalletButton: {
    marginTop: 10,
    alignSelf: 'center',
  },
  resetWalletContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  resetWalletText: {
    marginLeft: 5,
    color: '#FF9800',
    fontWeight: '500',
  },
  transactionsContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginHorizontal: 20,
  },
  emptyTransactionsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyTransactionsText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
  },
  transactionsList: {
    paddingTop: 10,
  },
  transactionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  transactionGradient: {
    padding: 15,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  transactionIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    color: '#666',
  },
  transactionParty: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  blockIdContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  blockIdLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 5,
  },
  blockIdText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
  snackbar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  snackbarText: {
    color: 'white',
    flex: 1,
    marginRight: 10,
  }
});

export default WalletScreen;