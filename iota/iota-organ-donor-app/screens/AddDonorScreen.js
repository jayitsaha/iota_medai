import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Title, Snackbar, HelperText, Card } from 'react-native-paper';
import { publishOrganRecord } from '../services/apiService';

export default function AddDonorScreen({ navigation }) {
  const [donorId, setDonorId] = useState('');
  const [organType, setOrganType] = useState('');
  const [status, setStatus] = useState('Available');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  const hasDonorIdError = () => donorId.length > 0 && donorId.length < 5;
  const hasOrganTypeError = () => organType.length > 0 && organType.length < 3;

  const handleSubmit = async () => {
    if (donorId.length < 5 || organType.length < 3) {
      setSnackbarMessage('Please fill in all fields correctly');
      setSnackbarVisible(true);
      return;
    }
    
    try {
      setLoading(true);
      const blockId = await publishOrganRecord(donorId, organType, status);
      setTransactionId(blockId);
      setSnackbarMessage('Donor record successfully published to IOTA!');
      setSnackbarVisible(true);
      
      // Clear the form
      setDonorId('');
      setOrganType('');
      setStatus('Available');
    } catch (error) {
      console.error('Error publishing record:', error);
      setSnackbarMessage('Error publishing record. Please try again.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Add New Organ Donor</Title>
      
      <TextInput
        label="Donor ID"
        value={donorId}
        onChangeText={setDonorId}
        mode="outlined"
        style={styles.input}
        error={hasDonorIdError()}
      />
      <HelperText type="error" visible={hasDonorIdError()}>
        Donor ID must be at least 5 characters
      </HelperText>
      
      <TextInput
        label="Organ Type"
        value={organType}
        onChangeText={setOrganType}
        mode="outlined"
        style={styles.input}
        error={hasOrganTypeError()}
      />
      <HelperText type="error" visible={hasOrganTypeError()}>
        Organ type must be at least 3 characters
      </HelperText>
      
      <TextInput
        label="Status"
        value={status}
        onChangeText={setStatus}
        mode="outlined"
        style={styles.input}
      />
      
      <Button 
        mode="contained" 
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Publish to IOTA Blockchain
      </Button>
      
      {transactionId ? (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Transaction Published!</Title>
            <TextInput
              label="Transaction ID"
              value={transactionId}
              multiline
              disabled
              mode="outlined"
              style={styles.transactionIdInput}
            />
          </Card.Content>
        </Card>
      ) : null}
      
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
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 10,
    marginBottom: 20,
    paddingVertical: 8,
  },
  card: {
    marginTop: 20,
  },
  transactionIdInput: {
    marginTop: 10,
  },
});