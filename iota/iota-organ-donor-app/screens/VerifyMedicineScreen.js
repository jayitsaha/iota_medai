import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Title, Card, Paragraph, Text, ActivityIndicator, Divider, List, Surface } from 'react-native-paper';
import { verifyMedicine, activateMedicine } from '../services/medicineService';
import { Camera } from 'expo-camera';

export default function VerifyMedicineScreen({ navigation, route }) {
  const [serialNumber, setSerialNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  
  // Use serialNumber from route params if provided
  useEffect(() => {
    if (route.params?.serialNumber) {
      setSerialNumber(route.params.serialNumber);
      // Automatically verify if coming with a serial number
      handleVerify(route.params.serialNumber);
    }
  }, [route.params?.serialNumber]);

  const cameraRef = useRef(null);
  
  const startScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    if (status === 'granted') {
      setScanning(true);
    } else {
      Alert.alert('Permission denied', 'Camera permission is required to scan medicine codes');
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanning(false);
    setSerialNumber(data);
    handleVerify(data);
  };

  const handleVerify = async (serialToVerify = null) => {
    const serialToUse = serialToVerify || serialNumber;
    
    if (!serialToUse || serialToUse.length < 5) {
      Alert.alert('Invalid Input', 'Please enter a valid serial number');
      return;
    }
    
    try {
      setLoading(true);
      const verificationResult = await verifyMedicine(serialToUse);
      setResult(verificationResult);
    } catch (error) {
      console.error('Error verifying medicine:', error);
      Alert.alert('Error', 'Failed to verify medicine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivation = async () => {
    try {
      setLoading(true);
      const activationResult = await activateMedicine(serialNumber);
      
      if (activationResult.success) {
        Alert.alert('Success', 'Medicine activated successfully');
        // Refresh the verification data
        const verificationResult = await verifyMedicine(serialNumber);
        setResult(verificationResult);
      } else {
        Alert.alert('Activation Failed', activationResult.error || 'Could not activate medicine');
      }
    } catch (error) {
      console.error('Error activating medicine:', error);
      Alert.alert('Error', 'Failed to activate medicine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = () => {
    if (!result) return null;

    if (!result.verified) {
      return (
        <Card style={styles.warningCard}>
          <Card.Content>
            <Title>Verification Failed</Title>
            <Paragraph style={styles.warningText}>
              {result.error || 'Could not verify this medicine'}
            </Paragraph>
          </Card.Content>
        </Card>
      );
    }

    if (result.data.status === 'recalled') {
      return (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Title>Warning: Recalled Medicine</Title>
            <Paragraph style={styles.errorText}>
              This medicine has been recalled and should not be used.
            </Paragraph>
          </Card.Content>
        </Card>
      );
    }

    if (result.alreadyActivated) {
      return (
        <Card style={styles.warningCard}>
          <Card.Content>
            <Title>Already Activated</Title>
            <Paragraph style={styles.warningText}>
              This medicine was already activated on {new Date(result.activationTime).toLocaleString()}
            </Paragraph>
            <Paragraph style={styles.noteText}>
              Note: If you did not activate this medicine previously, it may have been counterfeited. 
              {result.data.id ? (console.log(result.data.id)) : 'Pending'}
            </Paragraph>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.successCard}>
        <Card.Content>
          <Title>Authentic Medicine</Title>
          <Paragraph style={styles.successText}>
            This medicine is authentic and has not been activated yet.

            {result.data.id ? (console.log(result.data.id)) : 'Pending'}
          </Paragraph>
          <Button 
            mode="contained" 
            onPress={handleActivation} 
            style={styles.activateButton} 
            disabled={loading}
          >
            Activate Medicine
          </Button>
        </Card.Content>
      </Card>
    );
  };

  if (scanning) {
    return (
      <View style={styles.scannerContainer}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          onBarCodeScanned={handleBarCodeScanned}
          barCodeScannerSettings={{
            barCodeTypes: ['qr', 'code128', 'code39', 'code93', 'datamatrix', 'ean13', 'ean8', 'upc_e'],
          }}
        />
        <Button 
          mode="contained" 
          onPress={() => setScanning(false)} 
          style={styles.cancelButton}
        >
          Cancel
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Verify Medicine Authenticity</Title>
      
      <Surface style={styles.scanSurface}>
        <View style={styles.scanRow}>
          <TextInput
            label="Serial Number"
            value={serialNumber}
            onChangeText={setSerialNumber}
            mode="outlined"
            style={styles.input}
          />
          <Button 
            mode="contained" 
            onPress={startScanner}
            style={styles.scanButton}
            icon="camera"
          >
            Scan
          </Button>
        </View>
        
        <Button 
          mode="contained" 
          onPress={() => handleVerify()}
          loading={loading}
          disabled={loading}
          style={styles.button}
          icon="magnify"
        >
          Verify Medicine
        </Button>
      </Surface>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Verifying with blockchain...</Text>
        </View>
      )}
      
      {renderStatus()}
      
      {result && result.verified && (
        <Card style={styles.detailsCard}>
          <Card.Content>
            <Title>Medicine Details</Title>
            <Divider style={styles.divider} />
            
            <List.Item
              title="Name"
              description={result.data.name}
              left={props => <List.Icon {...props} icon="pill" />}
            />
            <List.Item
              title="Manufacturer"
              description={result.data.manufacturer}
              left={props => <List.Icon {...props} icon="factory" />}
            />
            <List.Item
              title="Batch Number"
              description={result.data.batch_number}
              left={props => <List.Icon {...props} icon="barcode" />}
            />
            <List.Item
              title="Production Date"
              description={result.data.production_date}
              left={props => <List.Icon {...props} icon="calendar" />}
            />
            <List.Item
              title="Expiration Date"
              description={result.data.expiration_date}
              left={props => <List.Icon {...props} icon="calendar-alert" />}
            />
            <List.Item
              title="Blockchain ID"
              description={result.data.id ? (result.data.id.substring(0, 15) + '...') : 'Pending'}
              left={props => <List.Icon {...props} icon="cube-outline" />}
            />
          </Card.Content>
        </Card>
      )}
      
      {result && result.verified && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.infoTitle}>What does this mean?</Title>
            <Paragraph>
              This medicine has been verified against the IOTA blockchain record. The data shown above was registered by the manufacturer and cannot be altered, ensuring its authenticity.
            </Paragraph>
            {result.alreadyActivated ? (
              <Paragraph style={styles.infoWarning}>
                This medicine has already been activated, which means someone has verified it before. If you're the first person to use this medicine, please contact the manufacturer.
              </Paragraph>
            ) : (
              <Paragraph style={styles.infoSuccess}>
                You're the first person to verify this medicine. Activating it will mark it as being used and help prevent counterfeits.
              </Paragraph>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  scanSurface: {
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginRight: 8,
    backgroundColor: 'white',
  },
  scanButton: {
    marginTop: 6,
  },
  button: {
    paddingVertical: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  successCard: {
    backgroundColor: '#e8f5e9',
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  warningCard: {
    backgroundColor: '#fff8e1',
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  errorCard: {
    backgroundColor: '#ffebee',
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  successText: {
    color: '#2e7d32',
    marginBottom: 10,
  },
  warningText: {
    color: '#f57c00',
    marginBottom: 10,
  },
  errorText: {
    color: '#c62828',
    marginBottom: 10,
  },
  noteText: {
    fontStyle: 'italic',
    marginTop: 10,
  },
  detailsCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  divider: {
    marginVertical: 10,
  },
  activateButton: {
    marginTop: 10,
  },
  scannerContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    margin: 20,
    marginBottom: 40,
  },
  infoCard: {
    marginBottom: 24,
    borderRadius: 8,
    elevation: this,
    backgroundColor: '#e3f2fd',
  },
  infoTitle: {
    fontSize: 18,
  },
  infoWarning: {
    marginTop: 8,
    color: '#f57c00',
    fontWeight: '500',
  },
  infoSuccess: {
    marginTop: 8,
    color: '#2e7d32',
    fontWeight: '500',
  },
});