import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Snackbar,
  HelperText,
  Card,
  Text,
  Paragraph,
  Divider,
  Appbar,
  SegmentedButtons,
  RadioButton
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addHealthcareRecord } from '../services/blockchainService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AddHealthcareRecordScreen = ({ navigation, route }) => {
  // Get patient ID from route params if available
  const initialPatientId = route.params?.patientId || '';
  
  // Common fields for all record types
  const [recordType, setRecordType] = useState('Prescription');
  const [provider, setProvider] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Patient information
  const [patientId, setPatientId] = useState(initialPatientId);
  const [patientList, setPatientList] = useState([]);
  
  // Prescription-specific fields
  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  
  // Blood test-specific fields
  const [testName, setTestName] = useState('');
  const [lab, setLab] = useState('');
  const [parameters, setParameters] = useState('');
  
  // Medical report-specific fields
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [treatment, setTreatment] = useState('');
  
  // Vaccination-specific fields
  const [vaccine, setVaccine] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [location, setLocation] = useState('');
  
  // Common state
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  // Load provider data on component mount
  useEffect(() => {
    loadProviderData();
    loadPatientList();
  }, []);
  
  // Load provider info from storage
  const loadProviderData = async () => {
    try {
      const providerData = await AsyncStorage.getItem('providerData');
      if (providerData) {
        const parsedData = JSON.parse(providerData);
        setProvider(parsedData.name || '');
      }
    } catch (error) {
      console.error('Error loading provider data:', error);
    }
  };
  
  // Load patient list (mock data for now)
  const loadPatientList = async () => {
    // In a real app, this would be fetched from an API
    setPatientList([
      { id: 'P12345', name: 'Mohan Patel' },
      { id: 'P23456', name: 'Priya Sharma' },
      { id: 'P34567', name: 'Arun Kumar' },
      { id: 'P45678', name: 'Neha Singh' }
    ]);
  };
  
  // Validation
  const hasProviderError = () => provider.length > 0 && provider.length < 3;
  const hasPatientIdError = () => patientId.length === 0;

  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const prepareRecordDetails = () => {
    // Create details object based on record type
    switch(recordType) {
      case 'Prescription':
        return {
          medication,
          dosage,
          frequency,
          duration,
          notes
        };
      
      case 'BloodTest':
        // Parse parameters as a list of tests
        let parsedParameters = [];
        if (parameters) {
          try {
            // Allow simple format like "Hemoglobin: 14.5 g/dL, WBC: 7.5 K/uL"
            const paramLines = parameters.split(',');
            parsedParameters = paramLines.map(line => {
              const [name, valueWithUnit] = line.split(':');
              // Simple parsing, could be more sophisticated
              return {
                name: name.trim(),
                value: valueWithUnit.trim()
              };
            });
          } catch(e) {
            parsedParameters = [{ name: 'Error', value: 'Could not parse parameters' }];
          }
        }
        
        return {
          test_name: testName,
          lab,
          parameters: parsedParameters
        };
      
      case 'MedicalReport':
        return {
          diagnosis,
          symptoms,
          treatment,
          notes
        };
      
      case 'Vaccination':
        return {
          vaccine,
          batch_number: batchNumber,
          location,
          notes
        };
        
      default:
        return {};
    }
  };

  const handleSubmit = async () => {
    // Validate patient ID
    if (!patientId) {
      setSnackbarMessage('Please select a patient');
      setSnackbarVisible(true);
      return;
    }
    
    // Validate basic fields
    if (provider.length < 3) {
      setSnackbarMessage('Please enter a valid provider name');
      setSnackbarVisible(true);
      return;
    }
    
    // Validate type-specific required fields
    if (recordType === 'Prescription' && !medication) {
      setSnackbarMessage('Please enter medication name');
      setSnackbarVisible(true);
      return;
    }
    
    if (recordType === 'BloodTest' && !testName) {
      setSnackbarMessage('Please enter test name');
      setSnackbarVisible(true);
      return;
    }
    
    if (recordType === 'Vaccination' && !vaccine) {
      setSnackbarMessage('Please enter vaccine name');
      setSnackbarVisible(true);
      return;
    }
    
    try {
      setLoading(true);
      
      // Prepare record details based on type
      const details = prepareRecordDetails();
      
      // Submit record to blockchain
      const result = await addHealthcareRecord(
        patientId,
        recordType,
        provider,
        formatDate(date),
        details
      );
      
      setTransactionId(result.blockId);
      setSnackbarMessage('Healthcare record successfully published to blockchain!');
      setSnackbarVisible(true);
      
      // Reset form fields
      resetFormFields();
    } catch (error) {
      console.error('Error publishing record:', error);
      setSnackbarMessage('Error publishing record. Please try again.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };
  
  const resetFormFields = () => {
    // Keep patient ID and provider
    
    // Reset record-specific fields
    setDate(new Date());
    
    // Reset type-specific fields
    setMedication('');
    setDosage('');
    setFrequency('');
    setDuration('');
    setTestName('');
    setLab('');
    setParameters('');
    setDiagnosis('');
    setSymptoms('');
    setTreatment('');
    setVaccine('');
    setBatchNumber('');
    setLocation('');
    setNotes('');
  };

  // Render specific fields based on record type
  const renderTypeSpecificFields = () => {
    switch(recordType) {
      case 'Prescription':
        return (
          <View>
            <TextInput
              label="Medication Name *"
              value={medication}
              onChangeText={setMedication}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Dosage"
              value={dosage}
              onChangeText={setDosage}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., 500mg"
            />
            
            <TextInput
              label="Frequency"
              value={frequency}
              onChangeText={setFrequency}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Twice daily"
            />
            
            <TextInput
              label="Duration"
              value={duration}
              onChangeText={setDuration}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., 10 days"
            />
            
            <TextInput
              label="Additional Notes"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
            />
          </View>
        );
        
      case 'BloodTest':
        return (
          <View>
            <TextInput
              label="Test Name *"
              value={testName}
              onChangeText={setTestName}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., Complete Blood Count"
            />
            
            <TextInput
              label="Laboratory"
              value={lab}
              onChangeText={setLab}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Test Parameters"
              value={parameters}
              onChangeText={setParameters}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={4}
              placeholder="e.g., Hemoglobin: 14.5 g/dL, WBC: 7.5 K/uL"
            />
            
            <Paragraph style={styles.helperText}>
              Enter parameters in format: "Name: Value, Name: Value"
            </Paragraph>
          </View>
        );
        
      case 'MedicalReport':
        return (
          <View>
            <TextInput
              label="Diagnosis *"
              value={diagnosis}
              onChangeText={setDiagnosis}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Symptoms"
              value={symptoms}
              onChangeText={setSymptoms}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              label="Treatment Plan"
              value={treatment}
              onChangeText={setTreatment}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              label="Additional Notes"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
            />
          </View>
        );
        
      case 'Vaccination':
        return (
          <View>
            <TextInput
              label="Vaccine Name *"
              value={vaccine}
              onChangeText={setVaccine}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Batch Number"
              value={batchNumber}
              onChangeText={setBatchNumber}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Vaccination Location"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., City Hospital"
            />
            
            <TextInput
              label="Additional Notes"
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              style={styles.input}
              multiline
              numberOfLines={3}
            />
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Add Healthcare Record" />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>New Healthcare Record</Title>
            
            <SegmentedButtons
              value={recordType}
              onValueChange={setRecordType}
              buttons={[
                { value: 'Prescription', label: 'Medication' },
                { value: 'BloodTest', label: 'Lab Test' },
                { value: 'MedicalReport', label: 'Report' },
                { value: 'Vaccination', label: 'Vaccine' },
              ]}
              style={styles.segmentedButtons}
            />
            
            <Divider style={styles.divider} />
            
            {/* Patient Selection Section */}
            <Text style={styles.sectionTitle}>Patient Information</Text>
            
            {patientId ? (
              <View style={styles.selectedPatientContainer}>
                <View style={styles.selectedPatient}>
                  <Text style={styles.selectedPatientText}>
                    Selected Patient: {patientList.find(p => p.id === patientId)?.name || patientId}
                  </Text>
                  <Button 
                    mode="text" 
                    onPress={() => setPatientId('')}
                    style={styles.changePatientButton}
                  >
                    Change
                  </Button>
                </View>
              </View>
            ) : (
              <View style={styles.patientSelectionContainer}>
                <Text style={styles.patientSelectionLabel}>Select Patient *</Text>
                <RadioButton.Group onValueChange={value => setPatientId(value)} value={patientId}>
                  {patientList.map(patient => (
                    <View key={patient.id} style={styles.patientOption}>
                      <RadioButton.Item 
                        label={`${patient.name} (${patient.id})`} 
                        value={patient.id}
                        position="leading"
                      />
                    </View>
                  ))}
                </RadioButton.Group>
                {hasPatientIdError() && (
                  <HelperText type="error" visible={hasPatientIdError()}>
                    Please select a patient
                  </HelperText>
                )}
              </View>
            )}
            
            <Divider style={styles.divider} />
            
            {/* Common fields for all record types */}
            <Text style={styles.sectionTitle}>Record Information</Text>
            
            <TextInput
              label="Healthcare Provider *"
              value={provider}
              onChangeText={setProvider}
              mode="outlined"
              style={styles.input}
              error={hasProviderError()}
            />
            <HelperText type="error" visible={hasProviderError()}>
              Provider name must be at least 3 characters
            </HelperText>
            
            <View style={styles.dateContainer}>
              <Text style={styles.dateLabel}>Record Date:</Text>
              <Button 
                mode="outlined" 
                onPress={() => setShowDatePicker(true)} 
                style={styles.dateButton}
                icon="calendar"
              >
                {formatDate(date)}
              </Button>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                  maximumDate={new Date()} // Can't select future dates
                />
              )}
            </View>
            
            <Divider style={styles.divider} />
            
            {/* Type-specific fields */}
            <Text style={styles.sectionTitle}>{recordType} Details</Text>
            {renderTypeSpecificFields()}
            
            <Button 
              mode="contained" 
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              icon="content-save"
            >
              Save to Blockchain
            </Button>
          </Card.Content>
        </Card>
        
        {transactionId ? (
          <Card style={styles.successCard}>
            <Card.Content>
              <Title style={styles.successTitle}>Record Published!</Title>
              <Text style={styles.successText}>
                This healthcare record has been registered on the blockchain successfully.
              </Text>
              <View style={styles.transactionContainer}>
                <Text style={styles.transactionLabel}>Blockchain Transaction ID:</Text>
                <Text style={styles.transactionId}>{transactionId}</Text>
              </View>
              
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('HealthcareList')}
                style={styles.viewRecordsButton}
                icon="format-list-bulleted"
              >
                View All Records
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
    marginBottom: 16,
    textAlign: 'center',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A6FA5',
    marginBottom: 12,
  },
  patientSelectionContainer: {
    marginBottom: 16,
  },
  patientSelectionLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  patientOption: {
    marginBottom: 4,
  },
  selectedPatientContainer: {
    marginBottom: 16,
  },
  selectedPatient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  selectedPatientText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A6FA5',
  },
  changePatientButton: {
    marginLeft: 8,
  },
  input: {
    marginBottom: 12,
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
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: -8,
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 6,
    backgroundColor: '#4A6FA5',
  },
  successCard: {
    marginBottom: 24,
    backgroundColor: '#E8F5E9',
    elevation: 2,
  },
  successTitle: {
    color: '#2E7D32',
  },
  successText: {
    marginVertical: 10,
    color: '#2E7D32',
  },
  transactionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
  },
  transactionLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  transactionId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  viewRecordsButton: {
    marginTop: 8,
    backgroundColor: '#2A9D8F',
  },
});

export default AddHealthcareRecordScreen;