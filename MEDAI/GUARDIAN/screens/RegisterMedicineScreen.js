import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Snackbar,
  HelperText,
  Card,
  Text,
  Appbar
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { registerMedicine } from '../services/blockchainService';

const RegisterMedicineScreen = ({ navigation }) => {
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
      setSnackbarMessage('Medicine successfully registered to blockchain!');
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Register Medicine" />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Add New Medicine to Blockchain</Title>
            <Text style={styles.description}>
              Register a new medicine to the blockchain for authentication and verification.
              This creates an immutable record that can be verified by patients.
            </Text>
            
            <TextInput
              label="Serial Number *"
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
              label="Medicine Name *"
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
              label="Manufacturer *"
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
              label="Batch Number *"
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
              <Button 
                mode="outlined" 
                onPress={() => setShowProdDatePicker(true)} 
                style={styles.dateButton}
              >
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
              <Button 
                mode="outlined" 
                onPress={() => setShowExpDatePicker(true)} 
                style={styles.dateButton}
              >
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
              style={styles.submitButton}
            >
              Register Medicine to Blockchain
            </Button>
          </Card.Content>
        </Card>
        
        {transactionId ? (
          <Card style={styles.successCard}>
            <Card.Content>
              <Title>Medicine Registered!</Title>
              <Text style={styles.successText}>
                This medicine has been successfully registered on the blockchain. Patients can now verify its authenticity by scanning the serial number or entering it manually.
              </Text>
              <Text style={styles.transactionLabel}>Transaction ID:</Text>
              <Text style={styles.transactionId}>{transactionId}</Text>
              
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('MedicineList')}
                style={styles.viewAllButton}
              >
                View All Medicines
              </Button>
            </Card.Content>
          </Card>
        ) : null}
      </ScrollView>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  dateContainer: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  dateButton: {
    marginTop: 4,
  },
  submitButton: {
    marginTop: 16,
    paddingVertical: 6,
    backgroundColor: '#4A6FA5',
  },
  successCard: {
    marginBottom: 24,
    backgroundColor: '#E8F5E9',
    elevation: 2,
  },
  successText: {
    marginVertical: 10,
    color: '#2E7D32',
  },
  transactionLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 16,
    marginBottom: 4,
  },
  transactionId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#0F172A',
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  viewAllButton: {
    marginTop: 8,
    backgroundColor: '#2A9D8F',
  },
});

export default RegisterMedicineScreen;