// src/screens/alzheimers/MedicationScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import OCRService from '../../services/OCRService';
import NotificationService from '../../services/NotificationService';
// Import filesystem module - add this
import * as FileSystem from 'expo-file-system';

// Import our Medicine Verification Workflow
import { useMedicineVerification } from '../../components/MedicineVerificationWorkflow';

const MedicationScreen = ({ navigation }) => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [scanningMode, setScanningMode] = useState(false);
  const [detailedView, setDetailedView] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Get medicine verification functions
  const { 
    addScannedMedicineToList,
    handleMedicineVerification,
    loadPrescriptions
  } = useMedicineVerification();

  // Load saved medicines whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMedications();
      // Also refresh prescriptions
      loadPrescriptions();
    }, [])
  );

  // Initial setup
  useEffect(() => {
    scheduleMedicationReminders();
    const unsubscribe = navigation?.addListener('focus', () => {
      setLoading(false);
      setProcessingImage(false);
      setVerifying(false);
    });
    return unsubscribe;
  }, [navigation, medicines]);

  // Load medicines from storage
  const loadMedications = async () => {
    try {
      setRefreshing(true);
      const savedMedicines = await AsyncStorage.getItem('medicines');
      if (savedMedicines) {
        setMedicines(JSON.parse(savedMedicines));
      }
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading medicines:', error);
      Alert.alert('Error', 'Failed to load your medications. Please try again.');
      setRefreshing(false);
    }
  };

  // Save medicines to storage
  const saveMedicines = async (medicinesList) => {
    try {
      await AsyncStorage.setItem('medicines', JSON.stringify(medicinesList));
      return true;
    } catch (error) {
      console.error('Error saving medicines:', error);
      Alert.alert('Error', 'Failed to save your medications. Please try again.');
      return false;
    }
  };


  const API_BASE_URL = 'http://192.168.71.82:5001';
  const MedicineVerificationAPI = {
    async verifyMedicineApiCAll(serialNumber) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/verify-medicine-blockchain`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serial_number: serialNumber
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Medicine verification API error:', error);
        throw error;
      }
    }
  };

  // NEW FUNCTION: Custom medicine verification that checks the JSON file
  const verifyMedicine = async (medicine) => {
    setVerifying(true);
    try {
      // Call the Flask API to verify the medicine
      const result = await MedicineVerificationAPI.verifyMedicineApiCAll(medicine.serialNumber);
      
      if (result.verified) {
        // Update the medicine's verification status
        const updatedMedicines = medicines.map(med => {
          if (med.id === medicine.id) {
            return {
              ...med,
              blockchain_verified: true
            };
          }
          return med;
        });
        
        // Save the updated medicines
        await saveMedicines(updatedMedicines);
        setMedicines(updatedMedicines);
        
        // If the detailed view is open, update it too
        if (detailedView && detailedView.id === medicine.id) {
          setDetailedView({
            ...detailedView,
            blockchain_verified: true
          });
        }
        
        // Schedule medication reminders (now that the medicine is verified)
        scheduleMedicationReminders();
        
        Alert.alert(
          'Verification Successful',
          result.message || `${medicine.name} has been verified and is safe to use.`,
          [{ text: 'OK' }]
        );
        
        setVerifying(false);
        return true;
      } else {
        // Failed verification with message from API
        Alert.alert(
          'Verification Failed',
          result.message || 'This medication could not be verified.',
          [{ text: 'OK' }]
        );
        
        setVerifying(false);
        return false;
      }
    } catch (error) {
      console.error('Error verifying medicine:', error);
      Alert.alert(
        'Verification Error',
        'Failed to connect to verification service. Please try again later.',
        [{ text: 'OK' }]
      );
      setVerifying(false);
      return false;
    }
  };
  // Handle prescription upload with Llama Vision analysis
  const handlePrescriptionUpload = async (useCamera = false) => {
    setProcessingImage(true);
    
    try {
      const imageUri = await OCRService.pickImage(useCamera);
      
      if (imageUri) {
        setLoading(true);
        
        // Step 1: First extract just the prescription serial number
        const prescriptionData = await OCRService.processPrescriptionImage(imageUri);


        console.log(prescriptionData)
        
        if (!prescriptionData.serial_number) {
          Alert.alert(
            'Verification Failed',
            'Could not find a prescription serial number in the document.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          setProcessingImage(false);
          return;
        }
        
        // Step 2: Verify the prescription serial number against blockchain
        const verificationResult = await verifyPrescriptionOnBlockchain(prescriptionData.serial_number);
        
        if (!verificationResult.verified) {
          Alert.alert(
            'Invalid Prescription',
            'This prescription has not been registered by a doctor in our system.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          setProcessingImage(false);
          return;
        }
        
        // Step 3: Only if verified, then process the full prescription
        
        if (prescriptionData && prescriptionData.medicines && prescriptionData.medicines.length > 0) {
          // Continue with existing code to add medicines...
          const newMedicines = prescriptionData.medicines.map(medicine => ({
            // Your existing medicine mapping code
            id: `med-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: medicine.name || 'Unknown Medication',
            // ... other fields
            fromPrescription: true,
            prescriptionSerialNumber: prescriptionData.serial_number, // Add reference to prescription
            blockchain_verified: true, // Mark as verified since prescription is verified
            serialNumber: `RX${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
          }));
          
          const updatedMedicines = [...medicines, ...newMedicines];
          setMedicines(updatedMedicines);
          await saveMedicines(updatedMedicines);
          
          Alert.alert(
            'Verified Prescription Processed',
            `Successfully verified and processed ${newMedicines.length} medications from your prescription.`,
            [{ text: 'OK' }]
          );
          
          scheduleMedicationReminders();
        } else {
          Alert.alert(
            'Analysis Incomplete',
            'Could not extract medicines from the verified prescription.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error processing prescription:', error);
      Alert.alert(
        'Error',
        'Failed to process prescription. Please try again with a clearer image.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setProcessingImage(false);
    }
  };


  const verifyPrescriptionOnBlockchain = async (serialNumber) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-prescription-blockchain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serial_number: serialNumber
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Prescription verification API error:', error);
      return { verified: false, error: error.message };
    }
  };

  // Handle medicine scanning with Llama Vision
  const handleMedicineScan = async () => {
    setLoading(true);
    setScanningMode(true);
    
    try {
      // Launch camera for scanning
      const imageUri = await OCRService.pickImage(true);
      
      if (imageUri) {
        // Process the medicine image with Llama Vision
        const scanResult = await OCRService.scanMedicine(imageUri);
        
        if (scanResult && scanResult.name) {
          // Create medicine object with scan data
          const medicineData = {
            name: scanResult.name,
            pillCount: scanResult.pillCount || 30,
            imageUri: imageUri,
            description: scanResult.description,
            expiryDate: scanResult.expiryDate,
            // Generate serial number for verification
            serialNumber: scanResult.serial_number
          };
          
          // Find if this medicine already exists
          const existingMedicineIndex = medicines.findIndex(
            med => med.name.toLowerCase().includes(scanResult.name.toLowerCase()) ||
                  scanResult.name.toLowerCase().includes(med.name.toLowerCase())
          );
          
          if (existingMedicineIndex !== -1) {
            // Update with the existing medicine's ID for verification
            medicineData.id = medicines[existingMedicineIndex].id;
            
            // Update the existing medicine with new scan data
            const updatedMedicines = [...medicines];
            updatedMedicines[existingMedicineIndex] = {
              ...updatedMedicines[existingMedicineIndex],
              imageUri: imageUri,
              description: scanResult.description,
              expiryDate: scanResult.expiryDate,
              // Don't change verification status
              remainingPills: scanResult.pillCount || updatedMedicines[existingMedicineIndex].remainingPills
            };
            
            // Save the updated medicine list
            setMedicines(updatedMedicines);
            await saveMedicines(updatedMedicines);
            
            Alert.alert(
              'Medicine Scanned',
              `${scanResult.name} has been updated in your list. It needs to be verified before use.`,
              [
                { text: 'Verify Now', onPress: () => verifyMedicine(updatedMedicines[existingMedicineIndex]) },
                { text: 'Later', style: 'cancel' }
              ]
            );
          } else {
            // Add as a new unverified medicine
            await addScannedMedicineToList(medicineData);
            
            // Refresh the medicine list
            loadMedications();
            
            Alert.alert(
              'Medicine Added',
              `${scanResult.name} has been added to your list. It needs to be verified before use.`,
              [
                { text: 'Verify Now', onPress: () => verifyMedicine(medicineData) },
                { text: 'Later', style: 'cancel' }
              ]
            );
          }
        } else {
          Alert.alert(
            'Scanning Failed',
            'Could not recognize the medication. Please try again with a clearer image.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error scanning medicine:', error);
      Alert.alert(
        'Error', 
        'Failed to scan medicine. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setScanningMode(false);
    }
  };

  // Handle manual pill count update
  const updatePillCount = (medicationId, newCount) => {
    const updatedMedicines = medicines.map(med => 
      med.id === medicationId ? { ...med, remainingPills: parseInt(newCount) } : med
    );
    
    setMedicines(updatedMedicines);
    saveMedicines(updatedMedicines);
    scheduleMedicationReminders();
    
    if (detailedView && detailedView.id === medicationId) {
      setDetailedView({...detailedView, remainingPills: parseInt(newCount)});
    }
  };

  // Delete medication
  const deleteMedication = (medicationId) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to remove this medication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedMedicines = medicines.filter(med => med.id !== medicationId);
            setMedicines(updatedMedicines);
            await saveMedicines(updatedMedicines);
            setModalVisible(false);
            scheduleMedicationReminders();
          }
        }
      ]
    );
  };

  // Schedule medication reminders
  const scheduleMedicationReminders = async () => {
    // Cancel existing reminders
    await NotificationService.cancelAllNotifications();
    
    // Schedule new reminders for each medicine
    medicines.forEach(medicine => {
      // Only schedule reminders for verified medicines or add a warning for unverified ones
      if (medicine.blockchain_verified) {
        // Morning reminder
        if (medicine.frequency.toLowerCase().includes('daily')) {
          NotificationService.scheduleDailyNotification(
            `Time to take ${medicine.name}`,
            `Take ${medicine.dosage} as prescribed.`,
            9, // 9 AM
            0,
            medicine.id + '-morning'
          );
        }
        
        // Evening reminder (if twice daily)
        if (medicine.frequency.toLowerCase().includes('twice')) {
          NotificationService.scheduleDailyNotification(
            `Time to take ${medicine.name}`,
            `Take ${medicine.dosage} as prescribed.`,
            18, // 6 PM
            0,
            medicine.id + '-evening'
          );
        }
      } else {
        // Reminder to verify medicine
        NotificationService.scheduleNotification(
          'Medicine Verification Needed',
          `${medicine.name} needs to be verified before use.`,
          new Date(Date.now() + 3600000), // 1 hour from now
          medicine.id + '-verify'
        );
      }
      
      // Refill reminder (for all medicines)
      const daysUntilRefill = Math.floor(medicine.remainingPills / (medicine.pillsPerDay || 1));
      if (daysUntilRefill <= 7) {
        // If less than 7 days of pills left, schedule refill reminder
        NotificationService.scheduleNotification(
          'Low Medication Alert',
          `You have only ${daysUntilRefill} days of ${medicine.name} left. Tap to reorder.`,
          new Date(Date.now() + 86400000), // Tomorrow
          medicine.id + '-refill'
        );
      }
    });
  };

  // View detailed medication information
  const viewMedicationDetails = (medication) => {
    setDetailedView(medication);
    setModalVisible(true);
  };

  // Medication detail modal
  const renderDetailModal = () => {
    if (!detailedView) return null;
    
    const daysLeft = Math.floor(detailedView.remainingPills / (detailedView.pillsPerDay || 1));
    const isLowStock = daysLeft <= 7;
    const isVerified = detailedView.blockchain_verified;
    
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
              <Text style={styles.modalTitle}>{detailedView.name}</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
              >
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* Verification status banner */}
              <View style={[
                styles.verificationBadge, 
                {backgroundColor: isVerified ? '#2DCE89' : '#FF6B6B'}
              ]}>
                <MaterialCommunityIcons 
                  name={isVerified ? "shield-check" : "shield-alert"} 
                  size={24} 
                  color="white" 
                />
                <Text style={styles.verificationText}>
                  {isVerified 
                    ? "Blockchain Verified" 
                    : "Not Verified - Medicine needs verification"}
                </Text>
              </View>
              
              {/* Warning for unverified medicines */}
              {!isVerified && (
                <View style={styles.warningBox}>
                  <MaterialCommunityIcons name="alert-circle" size={24} color="#FF6B6B" />
                  <Text style={styles.warningText}>
                    This medicine has not been verified and may not be safe to use.
                    Please verify it before taking.
                  </Text>
                </View>
              )}
              
              {detailedView.imageUri ? (
                <Image 
                  source={{ uri: detailedView.imageUri }} 
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.noImageContainer}>
                  <MaterialCommunityIcons name="image-outline" size={60} color="#DDD" />
                  <Text style={styles.noImageText}>No image available</Text>
                </View>
              )}
              
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Medication Information</Text>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Dosage:</Text>
                  <Text style={styles.infoValue}>{detailedView.dosage}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Frequency:</Text>
                  <Text style={styles.infoValue}>{detailedView.frequency}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pills Per Day:</Text>
                  <Text style={styles.infoValue}>{detailedView.pillsPerDay}</Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Remaining:</Text>
                  <Text style={[
                    styles.infoValue, 
                    isLowStock && styles.lowStockText
                  ]}>
                    {detailedView.remainingPills} pills ({daysLeft} days left)
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Serial Number:</Text>
                  <Text style={styles.infoValue}>{detailedView.serialNumber}</Text>
                </View>
                
                {detailedView.expiryDate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Expires:</Text>
                    <Text style={styles.infoValue}>{detailedView.expiryDate}</Text>
                  </View>
                )}
              </View>
              
              {detailedView.description && (
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>{detailedView.description}</Text>
                </View>
              )}
              
              <View style={styles.infoSection}>
                <Text style={styles.sectionTitle}>Refill History</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Last Refill:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(detailedView.lastRefill).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Refill Schedule:</Text>
                  <Text style={styles.infoValue}>Every {detailedView.refillSchedule} days</Text>
                </View>
              </View>
              
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.actionButtonPrimary}
                  onPress={() => {
                    // Prompt for manual pill count update
                    Alert.prompt(
                      'Update Pill Count',
                      'Enter the current number of pills:',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Update',
                          onPress: (pillCount) => {
                            if (pillCount && !isNaN(pillCount)) {
                              updatePillCount(detailedView.id, pillCount);
                            }
                          }
                        }
                      ],
                      'plain-text',
                      detailedView.remainingPills.toString()
                    );
                  }}
                >
                  <MaterialCommunityIcons name="pill" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Update Count</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionButtonSecondary}
                  onPress={() => {
                    setModalVisible(false);
                    verifyMedicine(detailedView);
                  }}
                  disabled={verifying}
                >
                  {verifying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  ) : (
                    <MaterialCommunityIcons 
                      name={isVerified ? "shield-refresh" : "shield-check"} 
                      size={20} 
                      color="#FFFFFF" 
                      style={{ marginRight: 8 }} 
                    />
                  )}
                  <Text style={styles.buttonText}>
                    {verifying ? "Verifying..." : isVerified ? "Re-verify" : "Verify Medicine"}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {isLowStock && (
                <TouchableOpacity
                  style={styles.reorderButtonLarge}
                  onPress={() => {
                    setModalVisible(false);
                    confirmReorder(detailedView);
                  }}
                >
                  <MaterialCommunityIcons name="cart" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Reorder Medication</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteMedication(detailedView.id)}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Remove Medication</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Render a medicine card
  const renderMedicineCard = ({ item }) => {
    const daysLeft = Math.floor(item.remainingPills / (item.pillsPerDay || 1));
    const isLowStock = daysLeft <= 7;
    const isVerified = item.blockchain_verified;
    
    return (
      <TouchableOpacity 
        style={[
          styles.medicineCard, 
          isLowStock && styles.lowStockCard,
          !isVerified && styles.unverifiedCard
        ]}
        onPress={() => viewMedicationDetails(item)}
      >
        <View style={styles.medicineHeaderRow}>
          <View style={styles.medicineHeader}>
            <Text style={styles.medicineName}>{item.name}</Text>
            <Text style={styles.medicineDosage}>{item.dosage}</Text>
          </View>
          
          {/* Verification badge */}
          {isVerified ? (
            <MaterialCommunityIcons name="shield-check" size={24} color="#2DCE89" />
          ) : (
            <MaterialCommunityIcons name="shield-alert" size={24} color="#FF6B6B" />
          )}
          
          {isLowStock && (
            <MaterialCommunityIcons name="alert-circle" size={24} color="#FF6347" />
          )}
        </View>
        
        <View style={styles.medicineDetails}>
          <View style={styles.leftColumn}>
            <View style={styles.medicineInfo}>
              <MaterialCommunityIcons name="clock-outline" size={18} color="#6A5ACD" />
              <Text style={styles.medicineInfoText}>{item.frequency}</Text>
            </View>
            
            <View style={styles.medicineInfo}>
              <MaterialCommunityIcons name="pill" size={18} color="#6A5ACD" />
              <Text 
                style={[
                  styles.medicineInfoText, 
                  isLowStock && styles.lowStockText
                ]}
              >
                {item.remainingPills} pills left ({daysLeft} days)
              </Text>
            </View>
            
            <View style={styles.medicineInfo}>
              <MaterialCommunityIcons name="key" size={18} color="#6A5ACD" />
              <Text style={styles.medicineInfoText}>
                SN: {item.serialNumber}
              </Text>
            </View>
            
            {/* Show verification status text */}
            {!isVerified && (
              <View style={styles.medicineInfo}>
                <MaterialCommunityIcons name="shield-alert" size={18} color="#FF6B6B" />
                <Text style={styles.verificationRequiredText}>
                  Verification required
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.rightColumn}>
            {item.imageUri ? (
              <Image source={{ uri: item.imageUri }} style={styles.medicineImage} />
            ) : (
              <View style={styles.miniNoImageContainer}>
                <MaterialCommunityIcons name="pill" size={32} color="#6A5ACD" />
              </View>
            )}
          </View>
        </View>
        
        {/* Show verify button for unverified medicines */}
        {!isVerified && (
          <TouchableOpacity 
            style={styles.verifyButton}
            onPress={() => verifyMedicine(item)}
            disabled={verifying}
          >
            {verifying ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 4 }} />
            ) : (
              <MaterialCommunityIcons name="shield-check" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            )}
            <Text style={styles.verifyText}>{verifying ? "Verifying..." : "Verify Medicine"}</Text>
          </TouchableOpacity>
        )}
        
        {isLowStock && isVerified && (
          <TouchableOpacity 
            style={styles.reorderButton}
            onPress={() => confirmReorder(item)}
          >
            <MaterialCommunityIcons name="cart" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.reorderText}>Reorder</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Confirm medication reorder
  const confirmReorder = (medication) => {
    // Only allow reordering verified medicines
    if (!medication.blockchain_verified) {
      Alert.alert(
        'Verification Required',
        'You need to verify this medicine before you can reorder it.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Verify Now', 
            onPress: () => {
              setModalVisible(false);
              verifyMedicine(medication);
            } 
          }
        ]
      );
      return;
    }
    
    Alert.alert(
      'Confirm Reorder',
      `Would you like to reorder ${medication.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reorder', 
          onPress: () => {
            Alert.alert(
              'Order Placed', 
              `Your ${medication.name} refill has been ordered.`,
              [{ text: 'OK' }]
            );
            
            // Update medication status
            const updatedMedicines = medicines.map(med => {
              if (med.id === medication.id) {
                return {
                  ...med,
                  lastRefill: new Date().toISOString().split('T')[0],
                  remainingPills: parseInt(med.quantity)
                };
              }
              return med;
            });
            
            setMedicines(updatedMedicines);
            saveMedicines(updatedMedicines);
            scheduleMedicationReminders();
          } 
        }
      ]
    );
  };
  
  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    loadMedications();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6A5ACD']} />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>My Medications</Text>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handlePrescriptionUpload(false)}
                disabled={loading || processingImage}
              >
                <MaterialCommunityIcons name="file-document" size={24} color="#6A5ACD" />
                <Text style={styles.actionText}>Upload</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handlePrescriptionUpload(true)}
                disabled={loading || processingImage}
              >
                <MaterialCommunityIcons name="camera-document" size={24} color="#6A5ACD" />
                <Text style={styles.actionText}>Capture</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleMedicineScan}
                disabled={loading || processingImage}
              >
                <MaterialCommunityIcons name="pill" size={24} color="#6A5ACD" />
                <Text style={styles.actionText}>Scan Med</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {loading || processingImage ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6A5ACD" />
              <Text style={styles.loadingText}>
                {processingImage 
                  ? 'Analyzing with Llama Vision...' 
                  : scanningMode 
                    ? 'Identifying medication...' 
                    : 'Processing prescription...'}
              </Text>
              <Text style={styles.loadingSubtext}>
                AI is analyzing the image. This may take a moment.
              </Text>
            </View>
          ) : medicines.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="pill" size={64} color="#DDD" />
              <Text style={styles.emptyText}>No medications added yet</Text>
              <Text style={styles.emptySubtext}>
                Upload a prescription or scan your medicines to get started
              </Text>
            </View>
          ) : (
            <>
              {/* Add a section for unverified medicines */}
              {medicines.some(med => !med.blockchain_verified) && (
                <View style={styles.unverifiedSection}>
                  <Text style={styles.unverifiedSectionTitle}>
                    Needs Verification
                  </Text>
                  <Text style={styles.unverifiedSectionDescription}>
                    These medicines need to be verified before use
                  </Text>
                  
                  <FlatList
                    data={medicines.filter(med => !med.blockchain_verified)}
                    renderItem={renderMedicineCard}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                  />
                </View>
              )}
              
              {/* Section for verified medicines */}
              {medicines.some(med => med.blockchain_verified) && (
                <View style={styles.verifiedSection}>
                  <Text style={styles.verifiedSectionTitle}>
                    Verified Medications
                  </Text>
                  <Text style={styles.verifiedSectionDescription}>
                    These medicines are verified and ready to use
                  </Text>
                  
                  <FlatList
                    data={medicines.filter(med => med.blockchain_verified)}
                    renderItem={renderMedicineCard}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
        
        {renderDetailModal()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA'
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 15,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F0F0FF',
    borderRadius: 12,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionText: {
    marginTop: 5,
    fontSize: 12,
    color: '#6A5ACD',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginVertical: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  loadingSubtext: {
    marginTop: 10,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginVertical: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    marginTop: 10,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  // Unverified section styles
  unverifiedSection: {
    marginBottom: 25,
  },
  unverifiedSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 5,
  },
  unverifiedSectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  // Verified section styles
  verifiedSection: {
    marginBottom: 20,
  },
  verifiedSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2DCE89',
    marginBottom: 5,
  },
  verifiedSectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  medicineCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6347',
  },
  unverifiedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  medicineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicineHeader: {
    marginBottom: 10,
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  medicineDosage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  medicineDetails: {
    flexDirection: 'row',
  },
  leftColumn: {
    flex: 2,
  },
  rightColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medicineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  lowStockText: {
    color: '#FF6347',
    fontWeight: '600',
  },
  verificationRequiredText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  medicineImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  miniNoImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButton: {
    flexDirection: 'row',
    backgroundColor: '#6A5ACD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
    alignItems: 'center',
  },
  verifyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reorderButton: {
    flexDirection: 'row',
    backgroundColor: '#6A5ACD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
    alignItems: 'center',
  },
  reorderText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  reorderButtonLarge: {
    flexDirection: 'row',
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 18,
  },
  // Verification badge styles
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  verificationText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Warning box for unverified medicines
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFEAEA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  warningText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#FF6B6B',
    lineHeight: 20,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 18,
  },
  noImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F0F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  noImageText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  infoSection: {
    marginBottom: 20,
    backgroundColor: '#F8F8FF',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6A5ACD',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    width: 120,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: '#6A5ACD',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginRight: 8,
  },
  actionButtonSecondary: {
    flex: 1,
    backgroundColor: '#7986CB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: '#FF6347',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 15,
    marginBottom: 20,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  }
});

export default MedicationScreen;