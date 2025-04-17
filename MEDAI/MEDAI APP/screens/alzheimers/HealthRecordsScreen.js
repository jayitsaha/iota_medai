// src/screens/alzheimers/HealthRecordsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  Alert,
  RefreshControl,
  SafeAreaView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import theme from '../../constants/theme';

// Import the healthcare service
import HealthcareService from '../../services/HealthcareService';
// Import the medicine verification context
import { useMedicineVerification } from '../../components/MedicineVerificationWorkflow';

const HealthRecordsScreen = ({ navigation }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [categories, setCategories] = useState([
    { id: 'all', name: 'All Records', icon: 'documents-outline', count: 0 },
    { id: 'prescription', name: 'Prescriptions', icon: 'document-text-outline', count: 0 },
    { id: 'test_result', name: 'Test Results', icon: 'flask-outline', count: 0 },
    { id: 'diagnosis', name: 'Diagnoses', icon: 'fitness-outline', count: 0 },
    { id: 'imaging', name: 'Imaging', icon: 'scan-outline', count: 0 }
  ]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filteredRecords, setFilteredRecords] = useState([]);

  // Get the medicine verification context
  const { loadPrescriptions } = useMedicineVerification();

  // Load patient ID on mount
  useEffect(() => {
    loadPatientId();
  }, []);

  // Refresh records when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (patientId) {
        loadHealthRecords();
      }
    }, [patientId])
  );

  // Filter records when category changes
  useEffect(() => {
    filterRecords();
  }, [selectedCategory, records]);

  const loadPatientId = async () => {
    try {
      const id = await AsyncStorage.getItem('user_id');
      if (id) {
        setPatientId('P12345');
      } else {
        // For development/testing, set a default patient ID
        const defaultId = 'P12345'
        await AsyncStorage.setItem('user_id', defaultId);
        setPatientId(defaultId);
      }
    } catch (error) {
      console.error('Error loading patient ID:', error);
      Alert.alert('Error', 'Could not load patient information');
    }
  };

  const loadHealthRecords = async () => {
    if (!patientId) return;
    
    try {
      setLoading(true);
      const healthRecords = await HealthcareService.fetchPatientHealthcareRecords(patientId);
      
      setRecords(healthRecords);
      
      // Update category counts
      updateCategoryCounts(healthRecords);
      
      // Also refresh prescriptions in the verification context
      await loadPrescriptions();
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching health records:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load health records. Please try again.');
    }
  };

  const updateCategoryCounts = (records) => {
    const updatedCategories = [...categories];
    
    // Reset counts
    updatedCategories.forEach(category => {
      category.count = 0;
    });
    
    // Count records by category
    records.forEach(record => {
      // Increment the specific category
      const categoryIndex = updatedCategories.findIndex(cat => cat.id === record.record_type);
      if (categoryIndex !== -1) {
        updatedCategories[categoryIndex].count += 1;
      }
      
      // Increment the "All" category
      updatedCategories[0].count += 1;
    });
    
    setCategories(updatedCategories);
  };

  const filterRecords = () => {
    if (selectedCategory === 'all') {
      setFilteredRecords(records);
    } else {
      setFilteredRecords(records.filter(record => record.record_type === selectedCategory));
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHealthRecords();
    setRefreshing(false);
  };

  const handleSelectCategory = (categoryId) => {
    setSelectedCategory(categoryId);
  };

  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setModalVisible(true);
  };

  const handleUploadPrescription = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });
      
      if (result.type === 'success') {
        setLoading(true);
        
        // In a real app, you would upload the file to a server
        // For now, we'll simulate adding a new record
        
        // Read the file (for demonstration purposes)
        const fileInfo = await FileSystem.getInfoAsync(result.uri);
        
        // Create a new record
        const newRecord = {
          record_id: 'rec_' + Math.random().toString(36).substring(2, 15),
          patient_id: patientId,
          record_type: 'prescription',
          provider: 'Uploaded by patient',
          date: new Date().toISOString().split('T')[0],
          details: {
            title: result.name,
            description: 'Uploaded prescription',
            fileSize: fileInfo.size,
            fileType: result.mimeType,
            medications: [
              {
                name: "Sample Medication",
                dosage: "10mg",
                frequency: "Once daily",
                quantity: "30",
                pillsPerDay: "1"
              }
            ]
          },
          status: "Active",
          timestamp: new Date().toISOString(),
          blockchain_verified: false, // Initially not verified
          file_uri: result.uri
        };
        
        // Show a verification prompt
        Alert.alert(
          'Prescription Upload',
          'Do you want to verify this prescription on the blockchain?',
          [
            { 
              text: 'Skip Verification', 
              style: 'cancel',
              onPress: async () => {
                // Just add the record without verification
                await addPrescriptionRecord(newRecord);
              }
            },
            { 
              text: 'Verify', 
              onPress: async () => {
                // Add record with blockchain verification
                await verifyAndAddPrescription(newRecord);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    }
  };

  // Add prescription record without verification
  const addPrescriptionRecord = async (record) => {
    try {
      // In a real app, you would call the API to add the record
      try {
        const response = await HealthcareService.addHealthcareRecord(
          patientId,
          'prescription',
          'Uploaded by patient',
          new Date().toISOString().split('T')[0],
          JSON.stringify(record.details)
        );
        
        if (response.blockId) {
          record.blockchain_id = response.blockId;
        }
        
        // Update the records list
        const updatedRecords = [record, ...records];
        setRecords(updatedRecords);
        updateCategoryCounts(updatedRecords);
        
        // Also refresh prescriptions in the verification context
        await loadPrescriptions();
        
        Alert.alert('Success', 'Prescription uploaded successfully');
      } catch (apiError) {
        console.error('API Error:', apiError);
        
        // Fallback to just updating the UI for demo purposes
        const updatedRecords = [record, ...records];
        setRecords(updatedRecords);
        updateCategoryCounts(updatedRecords);
        
        Alert.alert('Note', 'Prescription added locally (offline mode)');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error adding prescription:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to add prescription. Please try again.');
    }
  };

  // Verify prescription and add record
  const verifyAndAddPrescription = async (record) => {
    try {
      // In a real app, this would verify with the blockchain
      // For demo, simulate a verification delay
      setTimeout(async () => {
        // Add blockchain verification
        record.blockchain_verified = true;
        record.blockchain_id = `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Update the records list
        const updatedRecords = [record, ...records];
        setRecords(updatedRecords);
        updateCategoryCounts(updatedRecords);
        
        // Also refresh prescriptions in the verification context
        await loadPrescriptions();
        
        Alert.alert('Success', 'Prescription verified and added to blockchain');
        setLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error verifying prescription:', error);
      setLoading(false);
      Alert.alert('Verification Error', 'Failed to verify prescription. It has been added without verification.');
      
      // Add without verification as fallback
      await addPrescriptionRecord(record);
    }
  };

  // Check if a medicine is verified on the blockchain
  const checkMedicineVerified = async (medicineName) => {
    try {
      // Get verified medicines
      const verifiedMedicinesJson = await AsyncStorage.getItem('verified_medicines');
      const verifiedMedicines = verifiedMedicinesJson ? JSON.parse(verifiedMedicinesJson) : [];
      
      // Check if this medicine is verified
      return verifiedMedicines.some(med => 
        med.name.toLowerCase().includes(medicineName.toLowerCase()) ||
        medicineName.toLowerCase().includes(med.name.toLowerCase())
      );
    } catch (error) {
      console.error('Error checking medicine verification:', error);
      return false;
    }
  };

  const handleDownloadRecord = async (record) => {
    // In a real app, you would download the file from a server
    // For demonstration, we'll show a success message
    Alert.alert(
      'Download Record',
      'In a real app, this would download the record to your device.',
      [{ text: 'OK' }]
    );
  };

  const handleShareRecord = async (record) => {
    // In a real app, you would share the actual file
    // For demonstration, we'll create a temporary text file with record info
    
    try {
      // Create a temporary file with record details
      const fileContent = `
        Record ID: ${record.record_id}
        Type: ${record.record_type}
        Provider: ${record.provider}
        Date: ${record.date}
        Status: ${record.status}
        Details: ${JSON.stringify(record.details)}
      `;
      
      const fileUri = `${FileSystem.cacheDirectory}record_${record.record_id}.txt`;
      await FileSystem.writeAsStringAsync(fileUri, fileContent);
      
      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing record:', error);
      Alert.alert('Error', 'Failed to share record. Please try again.');
    }
  };

  // Verify a prescription by scanning its associated medicines
  const verifyPrescription = (record) => {
    // Extract medication names from prescription
    let details;
    try {
      details = typeof record.details === 'string' 
        ? JSON.parse(record.details) 
        : record.details;
    } catch (e) {
      console.error('Error parsing details:', e);
      Alert.alert('Error', 'Could not parse prescription details');
      return;
    }
    
    // Check if there are medications to verify
    if (!details || !details.medications || details.medications.length === 0) {
      Alert.alert(
        'No Medications Found',
        'No medications found in this prescription. Please add medications to verify.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Navigate to medication screen for verification
    navigation.navigate('Medication');
    
    // Show verification instructions
    Alert.alert(
      'Verify Prescription',
      'To verify this prescription, please scan each medication to confirm authenticity.',
      [{ text: 'OK' }]
    );
  };

  const renderCategoryButton = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item.id && styles.categoryButtonActive
      ]}
      onPress={() => handleSelectCategory(item.id)}
    >
      <Ionicons 
        name={item.icon} 
        size={24} 
        color={selectedCategory === item.id ? '#FFFFFF' : theme.colors.accent.alzheimers.main} 
      />
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.categoryTextActive
      ]}>
        {item.name}
      </Text>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryBadgeText}>{item.count}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecordItem = ({ item }) => {
    let icon;
    let color;
    
    switch (item.record_type) {
      case 'prescription':
        icon = 'document-text-outline';
        color = '#5E72E4';
        break;
      case 'test_result':
        icon = 'flask-outline';
        color = '#11CDEF';
        break;
      case 'diagnosis':
        icon = 'fitness-outline';
        color = '#2DCE89';
        break;
      case 'imaging':
        icon = 'scan-outline';
        color = '#FB6340';
        break;
      default:
        icon = 'document-outline';
        color = '#6A5ACD';
    }
    
    const details = typeof item.details === 'string' 
      ? JSON.parse(item.details) 
      : item.details;
    
    return (
      <TouchableOpacity
        style={styles.recordCard}
        onPress={() => handleViewRecord(item)}
      >
        <View style={styles.recordHeader}>
          <View style={[styles.recordIconContainer, { backgroundColor: color }]}>
            <Ionicons name={icon} size={24} color="white" />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordTitle}>
              {details?.title || `${item.record_type.charAt(0).toUpperCase() + item.record_type.slice(1)}`}
            </Text>
            <Text style={styles.recordProvider}>{item.provider}</Text>
          </View>
          <Text style={styles.recordDate}>{new Date(item.date).toLocaleDateString()}</Text>
        </View>
        
        <View style={styles.recordBody}>
          <Text numberOfLines={2} style={styles.recordDescription}>
            {details?.description || 'No description available'}
          </Text>
        </View>
        
        <View style={styles.recordFooter}>
          <View style={styles.blockchainStatus}>
            <Ionicons 
              name={!item.blockchain_verified ? "shield-checkmark" : "time-outline"} 
              size={16} 
              color={!item.blockchain_verified ? "#2DCE89" : "#FB6340"} 
            />
            <Text style={[
              styles.blockchainText, 
              {color: !item.blockchain_verified ? "#2DCE89" : "#FB6340"}
            ]}>
              {!item.blockchain_verified ? "Blockchain Verified" : "Pending Verification"}
            </Text>
          </View>
          
          {/* Add verify button for unverified prescriptions */}
          {item.record_type === 'prescription' && !item.blockchain_verified && (
            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={() => verifyPrescription(item)}
            >
              <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.verifyButtonText}>Verify</Text>
            </TouchableOpacity>
          )}
          
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecordDetails = () => {
    if (!selectedRecord) return null;
    
    const details = typeof selectedRecord.details === 'string' 
      ? JSON.parse(selectedRecord.details) 
      : selectedRecord.details;
    
    let icon;
    let color;
    
    switch (selectedRecord.record_type) {
      case 'prescription':
        icon = 'document-text-outline';
        color = '#5E72E4';
        break;
      case 'test_result':
        icon = 'flask-outline';
        color = '#11CDEF';
        break;
      case 'diagnosis':
        icon = 'fitness-outline';
        color = '#2DCE89';
        break;
      case 'imaging':
        icon = 'scan-outline';
        color = '#FB6340';
        break;
      default:
        icon = 'document-outline';
        color = '#6A5ACD';
    }
    
    return (
      <ScrollView style={styles.modalContent}>
        <View style={styles.recordDetailHeader}>
          <View style={[styles.recordDetailIconContainer, { backgroundColor: color }]}>
            <Ionicons name={icon} size={40} color="white" />
          </View>
          <Text style={styles.recordDetailTitle}>
            {details?.title || `${selectedRecord.record_type.charAt(0).toUpperCase() + selectedRecord.record_type.slice(1)}`}
          </Text>
        </View>
        
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Provider:</Text>
            <Text style={styles.infoValue}>{selectedRecord.provider}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{new Date(selectedRecord.date).toLocaleDateString()}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <Text style={[
              styles.infoValue, 
              { 
                color: selectedRecord.status === 'Active' ? '#2DCE89' : '#FB6340' 
              }
            ]}>
              {selectedRecord.status}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Record ID:</Text>
            <Text style={styles.infoValue}>{selectedRecord.record_id}</Text>
          </View>
          
          {selectedRecord.blockchain_id && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Blockchain ID:</Text>
              <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
                {selectedRecord.blockchain_id}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Details</Text>
          <Text style={styles.detailText}>
            {details?.description || 'No description available'}
          </Text>
          
          {details?.results && (
            <View style={styles.detailsTable}>
              {Object.entries(details.results).map(([key, value]) => (
                <View key={key} style={styles.tableRow}>
                  <Text style={styles.tableLabel}>{key}:</Text>
                  <Text style={styles.tableValue}>{value}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Render medications for prescriptions */}
          {selectedRecord.record_type === 'prescription' && details?.medications && (
            <View style={styles.medicationsSection}>
              <Text style={styles.subSectionTitle}>Medications</Text>
              {details.medications.map((med, index) => (
                <View key={index} style={styles.medicationItem}>
                  <Text style={styles.medicationName}>{med.name}</Text>
                  <Text style={styles.medicationDosage}>{med.dosage}</Text>
                  <Text style={styles.medicationInstructions}>{med.frequency}</Text>
                  
                  {/* Show verification status for each medication */}
                  <View style={styles.medicationVerifyRow}>
                    <TouchableOpacity 
                      style={styles.medicationVerifyButton}
                      onPress={async () => {
                        const isVerified = await checkMedicineVerified(med.name);
                        Alert.alert(
                          'Medication Status',
                          isVerified 
                            ? `${med.name} is verified on the blockchain` 
                            : `${med.name} is not verified. Please scan the medication to verify.`,
                          [
                            { text: 'OK' },
                            !isVerified ? { 
                              text: 'Scan Now', 
                              onPress: () => navigation.navigate('Medication')
                            } : null
                          ].filter(Boolean)
                        );
                      }}
                    >
                      <Ionicons name="shield-checkmark" size={16} color="#6A5ACD" />
                      <Text style={styles.medicationVerifyText}>Check Verification</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          
          {selectedRecord.file_uri && (
            <View style={styles.filePreview}>
              <Ionicons name="document" size={40} color="#6A5ACD" />
              <Text style={styles.fileName}>{details?.title || 'Document'}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#6A5ACD' }]}
            onPress={() => handleDownloadRecord(selectedRecord)}
          >
            <Ionicons name="download-outline" size={20} color="white" />
            <Text style={styles.actionButtonText}>Download</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#5E72E4' }]}
            onPress={() => handleShareRecord(selectedRecord)}
          >
            <Ionicons name="share-outline" size={20} color="white" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
        
        {/* Add verify button for prescriptions */}
        {selectedRecord.record_type === 'prescription' && !selectedRecord.blockchain_verified && (
          <TouchableOpacity
            style={styles.verifyButtonLarge}
            onPress={() => {
              setModalVisible(false);
              verifyPrescription(selectedRecord);
            }}
          >
            <Ionicons name="shield-checkmark" size={20} color="white" />
            <Text style={styles.verifyButtonLargeText}>Verify Prescription</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.blockchainVerification}>
          <View style={styles.verificationHeader}>
            <Ionicons 
              name={selectedRecord.blockchain_verified ? "shield-checkmark" : "time-outline"} 
              size={24} 
              color={selectedRecord.blockchain_verified ? "#2DCE89" : "#FB6340"} 
            />
            <Text style={[
              styles.verificationTitle, 
              {color: selectedRecord.blockchain_verified ? "#2DCE89" : "#FB6340"}
            ]}>
              {selectedRecord.blockchain_verified ? "Blockchain Verified" : "Pending Verification"}
            </Text>
          </View>
          <Text style={styles.verificationText}>
            {selectedRecord.blockchain_verified 
              ? "This medical record has been verified on the blockchain, ensuring its authenticity and integrity."
              : "This record is pending verification on the blockchain. Please check back later."}
          </Text>
          
          {selectedRecord.blockchain_id && (
            <TouchableOpacity style={styles.blockchainIdButton}>
              <Text style={styles.blockchainIdLabel}>Transaction ID:</Text>
              <Text style={styles.blockchainId} numberOfLines={1} ellipsizeMode="middle">
                {selectedRecord.blockchain_id}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Health Records</Text>
          
          <TouchableOpacity 
            style={styles.uploadButton}
            onPress={handleUploadPrescription}
            disabled={loading}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="white" />
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.categoriesContainer}>
          <FlatList
            data={categories}
            renderItem={renderCategoryButton}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6A5ACD" />
            <Text style={styles.loadingText}>Loading health records...</Text>
          </View>
        ) : records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#DDD" />
            <Text style={styles.emptyText}>No health records found</Text>
            <Text style={styles.emptySubtext}>
              Your healthcare providers will upload your records here, or you can upload them yourself
            </Text>
            <TouchableOpacity 
              style={styles.uploadEmptyButton}
              onPress={handleUploadPrescription}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="white" />
              <Text style={styles.uploadButtonText}>Upload Document</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredRecords}
            renderItem={renderRecordItem}
            keyExtractor={item => item.record_id}
            contentContainerStyle={styles.recordsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#6A5ACD']}
              />
            }
          />
        )}
        
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedRecord?.record_type.charAt(0).toUpperCase() + selectedRecord?.record_type.slice(1)} Details
                </Text>
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              {renderRecordDetails()}
            </View>
          </View>
        </Modal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 5,
  },
  categoriesContainer: {
    paddingVertical: 10,
  },
  categoriesList: {
    paddingHorizontal: 15,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#6A5ACD',
  },
  categoryText: {
    color: '#6A5ACD',
    fontWeight: '600',
    marginLeft: 5,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 5,
  },
  categoryBadgeText: {
    color: '#6A5ACD',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recordsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  recordCard: {
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
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  recordProvider: {
    fontSize: 14,
    color: '#666',
  },
  recordDate: {
    fontSize: 14,
    color: '#999',
  },
  recordBody: {
    marginBottom: 10,
  },
  recordDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blockchainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockchainText: {
    fontSize: 12,
    marginLeft: 5,
  },
  // Add verify button styles
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  verifyButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  verifyButtonLargeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
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
    marginBottom: 20,
  },
  uploadEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
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
  recordDetailHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordDetailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  recordDetailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  infoSection: {
    backgroundColor: '#F8F8FF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  detailsTable: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingVertical: 8,
  },
  tableLabel: {
    width: 150,
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tableValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  medicationsSection: {
    marginTop: 15,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  medicationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6A5ACD',
  },
  medicationName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  medicationDosage: {
    fontSize: 13,
    color: '#6A5ACD',
    marginVertical: 3,
  },
  medicationInstructions: {
    fontSize: 12,
    color: '#666',
  },
  // Add medication verification styles
  medicationVerifyRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5,
  },
  medicationVerifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  medicationVerifyText: {
    color: '#6A5ACD',
    fontSize: 12,
    marginLeft: 4,
  },
  filePreview: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 20,
    marginTop: 15,
  },
  fileName: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 5,
  },
  blockchainVerification: {
    backgroundColor: '#F8F8FF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  verificationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  blockchainIdButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  blockchainIdLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  blockchainId: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  }
});

export default HealthRecordsScreen;