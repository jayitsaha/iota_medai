import React, { useState, useEffect, useRef } from 'react';
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
  Card,
  Paragraph,
  Text,
  ActivityIndicator,
  Divider,
  List,
  Surface,
  Appbar,
  Chip
} from 'react-native-paper';
import { verifyMedicine, activateMedicine } from '../services/blockchainService';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Camera } from 'expo-camera';

const VerifyMedicineScreen = ({ navigation, route }) => {
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

    if (result.recalled) {
      return (
        <Card style={styles.errorCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Ionicons name="alert-circle" size={28} color="#C62828" />
              <Title style={styles.errorTitle}>Recalled Medicine</Title>
            </View>
            <Paragraph style={styles.errorText}>
              This medicine has been recalled and should not be used. Please return it to your pharmacy or healthcare provider.
            </Paragraph>
          </Card.Content>
        </Card>
      );
    }

    if (result.alreadyActivated) {
      return (
        <Card style={styles.warningCard}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Ionicons name="information-circle" size={28} color="#F57C00" />
              <Title style={styles.warningTitle}>Already Activated</Title>
            </View>
            <Paragraph style={styles.warningText}>
              This medicine was already activated on {new Date(result.activationTime).toLocaleString()}
            </Paragraph>
            <Card style={styles.noteCard}>
              <Card.Content>
                <Paragraph style={styles.noteText}>
                  <Ionicons name="alert-circle-outline" size={16} color="#F57C00" /> Note: If you did not activate this medicine previously, it may have been counterfeited. Please contact your healthcare provider.
                </Paragraph>
              </Card.Content>
            </Card>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={styles.successCard}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Ionicons name="checkmark-circle" size={28} color="#2E7D32" />
            <Title style={styles.successTitle}>Authentic Medicine</Title>
          </View>
          <Paragraph style={styles.successText}>
            This medicine is authentic and has not been activated yet. It is safe to use.
          </Paragraph>
          <Button 
            mode="contained" 
            onPress={handleActivation} 
            style={styles.activateButton} 
            disabled={loading}
            icon="shield-check"
          >
            Activate Medicine
          </Button>
          <Text style={styles.activateNote}>
            Activating helps prevent counterfeit medicines by marking this package as being used.
          </Text>
        </Card.Content>
      </Card>
    );
  };

  if (scanning) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => setScanning(false)} />
          <Appbar.Content title="Scan Barcode" />
        </Appbar.Header>
        <View style={styles.scannerContainer}>
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            onBarCodeScanned={handleBarCodeScanned}
            barCodeScannerSettings={{
              barCodeTypes: ['qr', 'code128', 'code39', 'code93', 'datamatrix', 'ean13', 'ean8', 'upc_e'],
            }}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerText}>Scan medicine barcode</Text>
          </View>
          <Button 
            mode="contained" 
            onPress={() => setScanning(false)} 
            style={styles.cancelButton}
            icon="close"
          >
            Cancel
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Verify Medicine" />
      </Appbar.Header>
      
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Verify Medicine Authenticity</Title>
            <Text style={styles.description}>
              Confirm that your medicine is authentic and has not been tampered with.
              Enter the serial number or scan the barcode on the packaging.
            </Text>
            
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
                style={styles.verifyButton}
                icon="magnify"
              >
                Verify Medicine
              </Button>
            </Surface>
          </Card.Content>
        </Card>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A6FA5" />
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
                title="Blockchain Verification"
                description={result.data.id ? "Verified on blockchain" : "Pending verification"}
                left={props => <List.Icon {...props} icon="check-decagram" />}
              />
            </Card.Content>
          </Card>
        )}
        
        {result && result.verified && (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Title style={styles.infoTitle}>What does this mean?</Title>
              <Paragraph style={styles.infoParagraph}>
                This medicine has been verified against the blockchain record. The data shown above was registered by the manufacturer and cannot be altered, ensuring its authenticity.
              </Paragraph>
              {result.alreadyActivated ? (
                <Card style={styles.infoWarningCard}>
                  <Card.Content>
                    <Paragraph style={styles.infoWarning}>
                      <Ionicons name="information-circle" size={16} color="#F57C00" /> This medicine has already been activated, which means someone has verified it before. If you're the first person to use this medicine, please contact the pharmacy.
                    </Paragraph>
                  </Card.Content>
                </Card>
              ) : (
                <Card style={styles.infoSuccessCard}>
                  <Card.Content>
                    <Paragraph style={styles.infoSuccess}>
                      <Ionicons name="checkmark-circle" size={16} color="#2E7D32" /> You're the first person to verify this medicine. Activating it will mark it as being used and help prevent counterfeits.
                    </Paragraph>
                  </Card.Content>
                </Card>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>
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
  scanSurface: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  scanButton: {
    marginTop: 6,
    backgroundColor: '#4A6FA5',
  },
  verifyButton: {
    paddingVertical: 6,
    backgroundColor: '#2A9D8F',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  successCard: {
    marginBottom: 16,
    backgroundColor: '#E8F5E9',
    elevation: 1,
  },
  warningCard: {
    marginBottom: 16,
    backgroundColor: '#FFF8E1',
    elevation: 1,
  },
  errorCard: {
    marginBottom: 16,
    backgroundColor: '#FFEBEE',
    elevation: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  successTitle: {
    color: '#2E7D32',
    marginLeft: 8,
  },
  warningTitle: {
    color: '#F57C00',
    marginLeft: 8,
  },
  errorTitle: {
    color: '#C62828',
    marginLeft: 8,
  },
  successText: {
    color: '#2E7D32',
    marginBottom: 16,
  },
  warningText: {
    color: '#F57C00',
    marginBottom: 16,
  },
  errorText: {
    color: '#C62828',
    marginBottom: 10,
  },
  noteCard: {
    backgroundColor: 'rgba(255, 248, 225, 0.5)',
    marginTop: 8,
  },
  noteText: {
    fontStyle: 'italic',
    fontSize: 12,
  },
  detailsCard: {
    marginBottom: 16,
    elevation: 1,
  },
  divider: {
    marginVertical: 10,
  },
  activateButton: {
    marginTop: 12,
    backgroundColor: '#4CAF50',
  },
  activateNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scannerContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  scannerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    margin: 20,
    marginBottom: 40,
    backgroundColor: '#E57373',
  },
  infoCard: {
    marginBottom: 24,
    elevation: 1,
  },
  infoTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  infoParagraph: {
    marginBottom: 16,
  },
  infoWarningCard: {
    backgroundColor: 'rgba(255, 248, 225, 0.5)',
    borderLeftWidth: 4,
    borderLeftColor: '#F57C00',
  },
  infoSuccessCard: {
    backgroundColor: 'rgba(232, 245, 233, 0.5)',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  infoWarning: {
    color: '#F57C00',
    fontWeight: '500',
  },
  infoSuccess: {
    color: '#2E7D32',
    fontWeight: '500',
  },
});

export default VerifyMedicineScreen;