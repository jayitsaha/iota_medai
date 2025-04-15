import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Title, Snackbar, HelperText, Card, Text, Paragraph, Divider, SegmentedButtons } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addHealthcareRecord } from '../services/healthcareService';

export default function AddHealthcareRecordScreen({ navigation }) {
  // Common fields for all record types
  const [recordType, setRecordType] = useState('Prescription');
  const [provider, setProvider] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
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
  const [patientId, setPatientId] = useState('P12345'); // Normally this would come from user profile
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  // Validation
  const hasProviderError = () => provider.length > 0 && provider.length < 3;

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
      setSnackbarMessage('Healthcare record successfully published to IOTA!');
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
    // Reset common fields
    setProvider('');
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
              label="Medication Name"
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
              label="Test Name"
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
              label="Diagnosis"
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
              label="Vaccine Name"
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
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Add New Healthcare Record</Title>
      
      <SegmentedButtons
        value={recordType}
        onValueChange={setRecordType}
        buttons={[
          { value: 'Prescription', label: 'Prescription' },
          { value: 'BloodTest', label: 'Blood Test' },
          { value: 'MedicalReport', label: 'Report' },
          { value: 'Vaccination', label: 'Vaccination' },
        ]}
        style={styles.segmentedButtons}
      />
      
      <Divider style={styles.divider} />
      
      {/* Common fields for all record types */}
      <TextInput
        label="Healthcare Provider"
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
      
      {/* Type-specific fields */}
      {renderTypeSpecificFields()}
      
      <Button 
        mode="contained" 
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitButton}
      >
        Save to Blockchain
      </Button>
      
      {transactionId ? (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Record Published!</Title>
            <Text style={styles.successText}>
              This healthcare record has been registered on the IOTA blockchain successfully.
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
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  divider: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  dateContainer: {
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 16,
    marginBottom: 6,
  },
  dateButton: {
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: -8,
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 24,
    paddingVertical: 8,
  },
  card: {
    marginBottom: 24,
  },
  successText: {
    marginVertical: 10,
  },
  transactionIdInput: {
    marginTop: 10,
  },
});