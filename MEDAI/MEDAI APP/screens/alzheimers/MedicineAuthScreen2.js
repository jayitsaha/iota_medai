// src/screens/alzheimers/MedicineAuthScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BarCodeScanner } from 'expo-barcode-scanner';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../constants/theme';

// Import the medicine service
import MedicineService from '../../services/MedicineService';

const MedicineAuthScreen = ({ navigation }) => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [scannedMedicine, setScannedMedicine] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);

  useEffect(() => {
    // Request camera permission
    (async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    
    // Load verified medicines from storage
    loadVerifiedMedicines();
  }, []);

  const loadVerifiedMedicines = async () => {
    try {
      const storedMedicines = await AsyncStorage.getItem('verified_medicines');
      if (storedMedicines) {
        setMedicines(JSON.parse(storedMedicines));
      }
    } catch (error) {
      console.error('Error loading verified medicines:', error);
    }
  };

  const saveVerifiedMedicines = async (medicinesList) => {
    try {
      await AsyncStorage.setItem('verified_medicines', JSON.stringify(medicinesList));
    } catch (error) {
      console.error('Error saving verified medicines:', error);
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanning(false);
    
    // Process the scanned data - in a real app, this would be a serial number or QR code
    if (data) {
      setSerialNumber(data);
      verifyMedicine(data);
    }
  };

  const handleManualEntry = () => {
    if (!serialNumber.trim()) {
      Alert.alert('Error', 'Please enter a valid serial number');
      return;
    }
    
    verifyMedicine(serialNumber);
  };

  const verifyMedicine = async (serial) => {
    try {
      setLoading(true);
      
      // Call the medicine verification service
      const result = await MedicineService.verifyMedicine(serial);
      
      setVerificationResult(result);
      setModalVisible(true);
      
      // If verification was successful and not already activated, let's activate it
      if (result.verified && !result.alreadyActivated) {
        try {
          const activationResult = await MedicineService.activateMedicine(serial);
          
          if (activationResult.success) {
            setVerificationResult({
              ...result,
              alreadyActivated: true,
              activationTime: new Date().toISOString()
            });
            
            // Add to verified medicines
            const medicine = {
              id: `med_${Date.now()}`,
              serialNumber: serial,
              name: result.data.name,
              manufacturer: result.data.manufacturer,
              batchNumber: result.data.batch_number,
              expiryDate: result.data.expiration_date,
              verifiedDate: new Date().toISOString(),
              activationDate: new Date().toISOString(),
              status: 'Verified & Activated'
            };
            
            const updatedMedicines = [...medicines, medicine];
            setMedicines(updatedMedicines);
            saveVerifiedMedicines(updatedMedicines);
          }
        } catch (activationError) {
          console.error('Error activating medicine:', activationError);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error verifying medicine:', error);
      setLoading(false);
      
      // Show error message
      Alert.alert(
        'Verification Failed',
        'Could not verify medicine. Please try again or check the serial number.',
        [{ text: 'OK' }]
      );
    }
  };

  const captureImage = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'You need to enable camera permissions to use this feature.');
        return;
      }
      
      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });
      
      if (!result.canceled) {
        // Process the image for OCR (in a real app)
        // For demo, let's simulate finding a serial number
        processMedicineImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  const processMedicineImage = (imageUri) => {
    setLoading(true);
    
    // Simulate image processing delay
    setTimeout(() => {
      const mockSerialNumber = `MED${Math.floor(10000000 + Math.random() * 90000000)}`;
      setSerialNumber(mockSerialNumber);
      
      Alert.alert(
        'Serial Number Detected',
        `We detected serial number: ${mockSerialNumber}\n\nWould you like to verify this medicine?`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
          { 
            text: 'Verify', 
            onPress: () => {
              verifyMedicine(mockSerialNumber);
            }
          }
        ]
      );
    }, 2000);
  };

  const handleOrderMedicine = (medicine) => {
    setSelectedMedicine(medicine);
    setOrderModalVisible(true);
  };

  const confirmOrder = () => {
    setLoading(true);
    
    // Simulate order processing
    setTimeout(() => {
      setOrderStatus({
        status: 'success',
        message: 'Your order has been successfully placed!',
        estimatedDelivery: new Date(Date.now() + 86400000 * 2).toLocaleDateString(), // 2 days from now
        trackingNumber: `TRK${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      });
      
      setLoading(false);
    }, 2000);
  };

  const renderMedicineItem = (medicine, index) => {
    return (
      <View key={medicine.id} style={styles.medicineCard}>
        <View style={styles.medicineHeader}>
          <Ionicons name="medical" size={24} color="#6A5ACD" />
          <View style={styles.medicineInfo}>
            <Text style={styles.medicineName}>{medicine.name}</Text>
            <Text style={styles.medicineManufacturer}>{medicine.manufacturer}</Text>
          </View>
        </View>
        
        <View style={styles.medicineDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Serial Number:</Text>
            <Text style={styles.detailValue}>{medicine.serialNumber}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Batch Number:</Text>
            <Text style={styles.detailValue}>{medicine.batchNumber}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expiry Date:</Text>
            <Text style={styles.detailValue}>{medicine.expiryDate}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Verified Date:</Text>
            <Text style={styles.detailValue}>
              {new Date(medicine.verifiedDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.medicineFooter}>
          <View style={styles.statusBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#2DCE89" />
            <Text style={styles.statusText}>{medicine.status}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.orderButton}
            onPress={() => handleOrderMedicine(medicine)}
          >
            <Ionicons name="cart" size={16} color="#FFFFFF" />
            <Text style={styles.orderButtonText}>Order Refill</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderVerificationModal = () => {
    if (!verificationResult) return null;
    
    const isVerified = verificationResult.verified;
    const isActivated = verificationResult.alreadyActivated;
    const medicine = verificationResult.data || {};
    
    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Verification Result</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.verificationHeader}>
                <View style={[
                  styles.verificationIconContainer,
                  {backgroundColor: isVerified ? '#2DCE89' : '#FB6340'}
                ]}>
                  <Ionicons
                    name={isVerified ? "shield-checkmark" : "alert-circle"}
                    size={40}
                    color="white"
                  />
                </View>
                
                <Text style={styles.verificationTitle}>
                  {isVerified 
                    ? 'Medicine Verified' 
                    : 'Verification Failed'}
                </Text>
                
                <Text style={styles.verificationSubtitle}>
                  {isVerified 
                    ? (isActivated 
                        ? 'This medicine has already been activated' 
                        : 'Medicine successfully verified on blockchain')
                    : 'This medicine could not be verified'}
                </Text>
              </View>
              
              {isVerified ? (
                <View style={styles.medicineDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{medicine.name}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Manufacturer:</Text>
                    <Text style={styles.detailValue}>{medicine.manufacturer}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Serial Number:</Text>
                    <Text style={styles.detailValue}>{medicine.serial_number}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Batch Number:</Text>
                    <Text style={styles.detailValue}>{medicine.batch_number}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Production Date:</Text>
                    <Text style={styles.detailValue}>{medicine.production_date}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Expiration Date:</Text>
                    <Text style={styles.detailValue}>{medicine.expiration_date}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[
                      styles.detailValue,
                      {color: medicine.status === 'recalled' ? '#FB6340' : '#2DCE89'}
                    ]}>
                      {medicine.status === 'recalled' 
                        ? 'Recalled' 
                        : (isActivated ? 'Activated' : 'Verified')}
                    </Text>
                  </View>
                  
                  {isActivated && verificationResult.activationTime && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Activated On:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(verificationResult.activationTime).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorMessage}>
                    {verificationResult.error || 'Unknown error occurred during verification'}
                  </Text>
                  <Text style={styles.errorHelp}>
                    Please check the serial number and try again, or contact your healthcare provider.
                  </Text>
                </View>
              )}
              
              {isVerified && (
                <TouchableOpacity
                  style={styles.orderModalButton}
                  onPress={() => {
                    setModalVisible(false);
                    setSelectedMedicine({
                      id: `med_${Date.now()}`,
                      serialNumber: medicine.serial_number,
                      name: medicine.name,
                      manufacturer: medicine.manufacturer,
                      batchNumber: medicine.batch_number,
                      expiryDate: medicine.expiration_date
                    });
                    setOrderModalVisible(true);
                  }}
                >
                  <Ionicons name="cart" size={20} color="#FFFFFF" />
                  <Text style={styles.orderModalButtonText}>Order This Medicine</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[
                  styles.closeModalButton,
                  {backgroundColor: isVerified ? '#6A5ACD' : '#FB6340'}
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderOrderModal = () => {
    if (!selectedMedicine) return null;
    
    return (
      <Modal
        visible={orderModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setOrderModalVisible(false);
          setOrderStatus(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {orderStatus ? 'Order Confirmation' : 'Order Medicine'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setOrderModalVisible(false);
                  setOrderStatus(null);
                }}
                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {orderStatus ? (
                <View style={styles.orderConfirmation}>
                  <View style={styles.orderSuccessIcon}>
                    <Ionicons name="checkmark-circle" size={80} color="#2DCE89" />
                  </View>
                  
                  <Text style={styles.orderSuccessTitle}>Order Placed!</Text>
                  <Text style={styles.orderSuccessMessage}>{orderStatus.message}</Text>
                  
                  <View style={styles.orderDetailsBox}>
                    <View style={styles.orderDetail}>
                      <Text style={styles.orderDetailLabel}>Medicine:</Text>
                      <Text style={styles.orderDetailValue}>{selectedMedicine.name}</Text>
                    </View>
                    
                    <View style={styles.orderDetail}>
                      <Text style={styles.orderDetailLabel}>Estimated Delivery:</Text>
                      <Text style={styles.orderDetailValue}>{orderStatus.estimatedDelivery}</Text>
                    </View>
                    
                    <View style={styles.orderDetail}>
                      <Text style={styles.orderDetailLabel}>Tracking Number:</Text>
                      <Text style={styles.orderDetailValue}>{orderStatus.trackingNumber}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.orderActionButton}
                    onPress={() => {
                      setOrderModalVisible(false);
                      setOrderStatus(null);
                    }}
                  >
                    <Text style={styles.orderActionButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.orderMedicineCard}>
                    <View style={styles.orderMedicineHeader}>
                      <Ionicons name="medical" size={30} color="#6A5ACD" />
                      <View style={styles.orderMedicineInfo}>
                        <Text style={styles.orderMedicineName}>{selectedMedicine.name}</Text>
                        <Text style={styles.orderMedicineManufacturer}>{selectedMedicine.manufacturer}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.orderMedicineDetails}>
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Serial Number:</Text>
                        <Text style={styles.orderDetailValue}>{selectedMedicine.serialNumber}</Text>
                      </View>
                      
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Batch Number:</Text>
                        <Text style={styles.orderDetailValue}>{selectedMedicine.batchNumber}</Text>
                      </View>
                      
                      <View style={styles.orderDetailRow}>
                        <Text style={styles.orderDetailLabel}>Blockchain Verified:</Text>
                        <View style={styles.verifiedBadge}>
                          <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
                          <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.orderForm}>
                    <Text style={styles.orderFormTitle}>Delivery Details</Text>
                    
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Quantity:</Text>
                      <View style={styles.quantitySelector}>
                        <TouchableOpacity style={styles.quantityButton}>
                          <Text style={styles.quantityButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.quantity}>1</Text>
                        <TouchableOpacity style={styles.quantityButton}>
                          <Text style={styles.quantityButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Delivery Address:</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Your saved address will be used"
                        editable={false}
                      />
                    </View>
                    
                    <View style={styles.formField}>
                      <Text style={styles.formLabel}>Delivery Method:</Text>
                      <View style={styles.deliveryOptions}>
                        <TouchableOpacity style={styles.deliveryOption}>
                          <Ionicons name="bicycle" size={24} color="#6A5ACD" />
                          <Text style={styles.deliveryOptionText}>Standard</Text>
                          <Text style={styles.deliveryTime}>2-3 days</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={[styles.deliveryOption, styles.deliveryOptionSelected]}>
                          <Ionicons name="car" size={24} color="#FFFFFF" />
                          <Text style={[styles.deliveryOptionText, {color: '#FFFFFF'}]}>Express</Text>
                          <Text style={[styles.deliveryTime, {color: '#FFFFFF'}]}>1 day</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.orderSummary}>
                      <Text style={styles.orderSummaryTitle}>Order Summary</Text>
                      
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryItem}>Medicine (1x)</Text>
                        <Text style={styles.summaryPrice}>$45.99</Text>
                      </View>
                      
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryItem}>Express Delivery</Text>
                        <Text style={styles.summaryPrice}>$9.99</Text>
                      </View>
                      
                      <View style={[styles.summaryRow, styles.summaryTotal]}>
                        <Text style={styles.summaryTotalLabel}>Total</Text>
                        <Text style={styles.summaryTotalPrice}>$55.98</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                      style={styles.orderButton}
                      onPress={confirmOrder}
                    >
                      <Text style={styles.orderButtonText}>Place Order</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Medicine Verification</Text>
        </View>
        
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setScanning(true)}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="scan" size={28} color="#6A5ACD" />
            </View>
            <Text style={styles.actionText}>Scan QR/Barcode</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={captureImage}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="camera" size={28} color="#6A5ACD" />
            </View>
            <Text style={styles.actionText}>Capture Image</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Medication')}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="medkit" size={28} color="#6A5ACD" />
            </View>
            <Text style={styles.actionText}>My Medications</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.manualEntryContainer}>
          <TextInput
            style={styles.serialInput}
            placeholder="Enter medicine serial number"
            value={serialNumber}
            onChangeText={setSerialNumber}
            placeholderTextColor="#999"
          />
          <TouchableOpacity 
            style={styles.verifyButton}
            onPress={handleManualEntry}
          >
            <Text style={styles.verifyButtonText}>Verify</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#6A5ACD" />
          <Text style={styles.infoText}>
            Verify your medications by scanning the barcode, QR code, or entering the serial number. 
            All verified medicines are secured on the blockchain.
          </Text>
        </View>
        
        <Text style={styles.sectionTitle}>Verified Medicines</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6A5ACD" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        ) : medicines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="medical" size={64} color="#DDD" />
            <Text style={styles.emptyText}>No verified medicines yet</Text>
            <Text style={styles.emptySubtext}>
              Verify your medications to ensure they're authentic and safe to use
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.medicinesList}>
            {medicines.map((medicine, index) => renderMedicineItem(medicine, index))}
          </ScrollView>
        )}
        
        {/* Scanner Modal */}
        <Modal
          visible={scanning}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setScanning(false)}
        >
          <View style={styles.scannerContainer}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity
                style={styles.scannerCloseButton}
                onPress={() => setScanning(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Scan Medicine Code</Text>
            </View>
            
            {hasPermission === null ? (
              <View style={styles.scannerMessage}>
                <Text>Requesting camera permission...</Text>
              </View>
            ) : hasPermission === false ? (
              <View style={styles.scannerMessage}>
                <Text>No access to camera</Text>
                <TouchableOpacity
                  style={styles.scannerActionButton}
                  onPress={() => setScanning(false)}
                >
                  <Text style={styles.scannerActionButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.scannerContent}>
                <BarCodeScanner
                  onBarCodeScanned={scanning ? handleBarCodeScanned : undefined}
                  style={styles.scanner}
                />
                <View style={styles.scannerOverlay}>
                  <View style={styles.scannerTarget} />
                </View>
                <View style={styles.scannerInstructions}>
                  <Text style={styles.scannerInstructionsText}>
                    Position the barcode or QR code inside the square
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Modal>
        
        {/* Verification Result Modal */}
        {renderVerificationModal()}
        
        {/* Order Modal */}
        {renderOrderModal()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    color: '#6A5ACD',
    fontWeight: '600',
    textAlign: 'center',
  },
  manualEntryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  serialInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    color: '#333',
  },
  verifyButton: {
    backgroundColor: '#6A5ACD',
    height: 48,
    paddingHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 10,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F0F0FF',
    borderRadius: 8,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6A5ACD',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  medicinesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicineInfo: {
    marginLeft: 12,
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  medicineManufacturer: {
    fontSize: 14,
    color: '#666',
  },
  medicineDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    width: 110,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  medicineFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#2DCE89',
    fontWeight: '600',
  },
  orderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  orderButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 5,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scannerCloseButton: {
    padding: 5,
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  scannerContent: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTarget: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#6A5ACD',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scannerInstructions: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scannerInstructionsText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scannerMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  scannerActionButton: {
    backgroundColor: '#6A5ACD',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  scannerActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 20,
  },
  verificationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  verificationIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  verificationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  verificationSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FB6340',
    marginBottom: 10,
  },
  errorHelp: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  orderModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 20,
  },
  orderModalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },
  closeModalButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  closeModalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  orderMedicineCard: {
    backgroundColor: '#F0F0FF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  orderMedicineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderMedicineInfo: {
    marginLeft: 15,
    flex: 1,
  },
  orderMedicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  orderMedicineManufacturer: {
    fontSize: 14,
    color: '#666',
  },
  orderMedicineDetails: {
    marginBottom: 5,
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDetailLabel: {
    width: 120,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  orderDetailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2DCE89',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 5,
    fontSize: 12,
  },
  orderForm: {
    marginBottom: 20,
  },
  orderFormTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  formField: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  formInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    color: '#333',
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    color: '#6A5ACD',
    fontWeight: 'bold',
  },
  quantity: {
    marginHorizontal: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  deliveryOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deliveryOption: {
    width: '48%',
    backgroundColor: '#F0F0FF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  deliveryOptionSelected: {
    backgroundColor: '#6A5ACD',
  },
  deliveryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A5ACD',
    marginTop: 5,
  },
  deliveryTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  orderSummary: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 15,
    marginVertical: 15,
  },
  orderSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 14,
    color: '#666',
  },
  summaryPrice: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    paddingTop: 10,
    marginTop: 5,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryTotalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6A5ACD',
  },
  orderConfirmation: {
    alignItems: 'center',
    padding: 20,
  },
  orderSuccessIcon: {
    marginBottom: 20,
  },
  orderSuccessTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  orderSuccessMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  orderDetailsBox: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 15,
    width: '100%',
    marginBottom: 20,
  },
  orderDetail: {
    marginBottom: 10,
  },
  orderDetailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  orderDetailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  orderActionButton: {
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  orderActionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default MedicineAuthScreen;