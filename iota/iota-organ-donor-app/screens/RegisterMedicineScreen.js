import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Title, Snackbar, HelperText, Card, Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { registerMedicine } from '../services/medicineService';

export default function RegisterMedicineScreen({ navigation }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [productionDate, setProductionDate] = useState(new Date());
  const [expirationDate, setExpirationDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)); // Default 1 year from now
  const [showProdDatePicker, setShowProdDatePicker] = useState(false);
  const [showExpDatePicker, setShowExpDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  const hasSerialError = () => serialNumber.length > 0 && serialNumber.length < 5;
  const hasNameError = () => name.length > 0 && name.length < 3;
  const hasManufacturerError = () => manufacturer.length > 0 && manufacturer.length < 3;
  const hasBatchError = () => batchNumber.length > 0 && batchNumber.length < 3;

  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const onChangeProdDate = (event, selectedDate) => {
    setShowProdDatePicker(false);
    if (selectedDate) {
      setProductionDate(selectedDate);
    }
  };

  const onChangeExpDate = (event, selectedDate) => {
    setShowExpDatePicker(false);
    if (selectedDate) {
      setExpirationDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (serialNumber.length < 5 || name.length < 3 || manufacturer.length < 3 || batchNumber.length < 3) {
      setSnackbarMessage('Please fill in all fields correctly');
      setSnackbarVisible(true);
      return;
    }
    
    try {
      setLoading(true);
      const blockId = await registerMedicine(
        serialNumber,
        name,
        manufacturer,
        batchNumber,
        formatDate(productionDate),
        formatDate(expirationDate)
      );
      setTransactionId(blockId);
      setSnackbarMessage('Medicine successfully registered to IOTA!');
      setSnackbarVisible(true);
      
      // Clear the form
      setSerialNumber('');
      setName('');
      setManufacturer('');
      setBatchNumber('');
      setProductionDate(new Date());
      setExpirationDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    } catch (error) {
      console.error('Error registering medicine:', error);
      setSnackbarMessage('Error registering medicine. Please try again.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Register New Medicine</Title>
      
      <TextInput
        label="Serial Number"
        value={serialNumber}
        onChangeText={setSerialNumber}
        mode="outlined"
        style={styles.input}
        error={hasSerialError()}
      />
      <HelperText type="error" visible={hasSerialError()}>
        Serial number must be at least 5 characters
      </HelperText>
      
      <TextInput
        label="Medicine Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
        error={hasNameError()}
      />
      <HelperText type="error" visible={hasNameError()}>
        Medicine name must be at least 3 characters
      </HelperText>
      
      <TextInput
        label="Manufacturer"
        value={manufacturer}
        onChangeText={setManufacturer}
        mode="outlined"
        style={styles.input}
        error={hasManufacturerError()}
      />
      <HelperText type="error" visible={hasManufacturerError()}>
        Manufacturer must be at least 3 characters
      </HelperText>
      
      <TextInput
        label="Batch Number"
        value={batchNumber}
        onChangeText={setBatchNumber}
        mode="outlined"
        style={styles.input}
        error={hasBatchError()}
      />
      <HelperText type="error" visible={hasBatchError()}>
        Batch number must be at least 3 characters
      </HelperText>
      
      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>Production Date:</Text>
        <Button mode="outlined" onPress={() => setShowProdDatePicker(true)} style={styles.dateButton}>
          {formatDate(productionDate)}
        </Button>
        {showProdDatePicker && (
          <DateTimePicker
            value={productionDate}
            mode="date"
            display="default"
            onChange={onChangeProdDate}
          />
        )}
      </View>
      
      <View style={styles.dateContainer}>
        <Text style={styles.dateLabel}>Expiration Date:</Text>
        <Button mode="outlined" onPress={() => setShowExpDatePicker(true)} style={styles.dateButton}>
          {formatDate(expirationDate)}
        </Button>
        {showExpDatePicker && (
          <DateTimePicker
            value={expirationDate}
            mode="date"
            display="default"
            onChange={onChangeExpDate}
          />
        )}
      </View>
      
      <Button 
        mode="contained" 
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        Register Medicine to Blockchain
      </Button>
      
      {transactionId ? (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Medicine Registered!</Title>
            <Text style={styles.successText}>
              This medicine has been registered on the IOTA blockchain and is ready to be verified by users.
            </Text>
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
  dateContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 16,
    marginBottom: 6,
  },
  dateButton: {
    marginTop: 4,
  },
  button: {
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 8,
  },
  card: {
    marginTop: 20,
  },
  successText: {
    marginVertical: 10,
  },
  transactionIdInput: {
    marginTop: 10,
  },
});