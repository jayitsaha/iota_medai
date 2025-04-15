import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Card, Title, Text, Button, TextInput, RadioButton, Divider, Snackbar } from 'react-native-paper';
import { useWallet } from '../services/walletService';

export default function AddFundsScreen({ navigation }) {
  const { requestTokens, balance, getBalance } = useWallet();
  const [amount, setAmount] = useState('100');
  const [paymentMethod, setPaymentMethod] = useState('creditCard');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Get latest balance when screen opens
  useEffect(() => {
    getBalance().catch(err => console.error("Error fetching balance:", err));
  }, []);

  const handleAddFunds = async () => {
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      console.log(`Requesting ${amount} tokens...`);
      // For this demo, we'll use the faucet functionality
      const result = await requestTokens(parseFloat(amount));
      
      setSnackbarMessage(`${amount} MEDAI tokens have been added to your wallet!`);
      setSnackbarVisible(true);
      
      // Show a success alert and navigate back
      setTimeout(() => {
        Alert.alert(
          'Funds Added', 
          `${amount} MEDAI tokens have been added to your wallet!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }, 500);
    } catch (error) {
      console.error("Error adding funds:", error);
      setSnackbarMessage(error.message || 'Failed to add funds');
      setSnackbarVisible(true);
      Alert.alert('Error', error.message || 'Failed to add funds');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Add Funds to Your Wallet</Title>
          <Text style={styles.subtitle}>
            Purchase MEDAI tokens to use for healthcare services
          </Text>

          <TextInput
            label="Amount (MEDAI Tokens)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
            mode="outlined"
          />

          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <RadioButton.Group onValueChange={value => setPaymentMethod(value)} value={paymentMethod}>
            <View style={styles.radioOption}>
              <RadioButton value="creditCard" />
              <Text>Credit/Debit Card</Text>
            </View>
            
            <View style={styles.radioOption}>
              <RadioButton value="bankTransfer" />
              <Text>Bank Transfer</Text>
            </View>
            
            <View style={styles.radioOption}>
              <RadioButton value="crypto" />
              <Text>Cryptocurrency</Text>
            </View>
          </RadioButton.Group>

          <Divider style={styles.divider} />
          
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text>Amount:</Text>
              <Text>{amount} MEDAI</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>Fee:</Text>
              <Text>0 MEDAI</Text>
            </View>
            <Divider style={styles.dividerSmall} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalText}>Total:</Text>
              <Text style={styles.totalText}>{amount} MEDAI</Text>
            </View>
          </View>
          
          <Button 
            mode="contained" 
            onPress={handleAddFunds} 
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            Add Funds
          </Button>

          <Text style={styles.walletInfo}>
            Current wallet balance: {balance} MEDAI
          </Text>

          <Text style={styles.disclaimer}>
            Note: In this demo app, funds are added through a simulated faucet. 
            In a production app, this would connect to a real payment processor.
          </Text>
        </Card.Content>
      </Card>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  divider: {
    marginVertical: 16,
  },
  dividerSmall: {
    marginVertical: 8,
  },
  summary: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  totalText: {
    fontWeight: 'bold',
  },
  button: {
    marginBottom: 16,
  },
  walletInfo: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});