import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  ScrollView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { CONFIG } from '../config';
import { publishOrganRecord, fetchOrganRecords, OrganRecord } from '../services/apiService';

const API_URL = CONFIG?.API_URL || 'http://localhost:3000/api';

const OrganDonorRegistryScreen = ({ navigation }) => {
  // State for donor records
  const [donorRecords, setDonorRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State for search
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for hospital data
  const [hospital, setHospital] = useState(null);
  
  // State for add/edit donor modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState(null);
  const [donorForm, setDonorForm] = useState({
    donorId: '',
    name: '',
    age: '',
    bloodType: '',
    organType: '',
    status: 'Available'
  });
  
  // Status options
  const statusOptions = [
    { value: 'Available', label: 'Available' },
    { value: 'Matched', label: 'Matched' },
    { value: 'Transplanted', label: 'Transplanted' },
    { value: 'Expired', label: 'Expired' }
  ];
  
  // Organ type options
  const organTypeOptions = [
    { value: 'Heart', label: 'Heart' },
    { value: 'Kidney', label: 'Kidney' },
    { value: 'Liver', label: 'Liver' },
    { value: 'Lung', label: 'Lung' },
    { value: 'Pancreas', label: 'Pancreas' },
    { value: 'Cornea', label: 'Cornea' },
    { value: 'Intestine', label: 'Intestine' }
  ];
  
  // Blood type options
  const bloodTypeOptions = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' }
  ];
  
  // Load hospital data and donor records
  useEffect(() => {
    loadHospitalData();
    loadDonorRecords();
  }, []);
  
  // Filter records when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRecords(donorRecords);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = donorRecords.filter(record => 
        record.donor_id?.toLowerCase().includes(query) ||
        record.name?.toLowerCase().includes(query) ||
        record.organ_type?.toLowerCase().includes(query) ||
        record.status?.toLowerCase().includes(query)
      );
      setFilteredRecords(filtered);
    }
  }, [searchQuery, donorRecords]);
  
  // Load hospital data from storage
  const loadHospitalData = async () => {
    try {
      const hospitalData = await AsyncStorage.getItem('hospitalData');
      if (hospitalData) {
        setHospital(JSON.parse(hospitalData));
      }
    } catch (error) {
      console.error('Error loading hospital data:', error);
    }
  };
  
  // Load donor records from the blockchain
  const loadDonorRecords = async () => {
    try {
      setLoading(true);
      
      // Fetch organ donor records from the blockchain
      const records = await fetchOrganRecords();
      
      // Filter records for this hospital if hospital ID is available
      let filteredRecords = records;
      if (hospital && hospital.id) {
        filteredRecords = records.filter(record => record.hospital_id === hospital.id);
      }
      
      setDonorRecords(filteredRecords);
      setFilteredRecords(filteredRecords);
    } catch (error) {
      console.error('Error loading donor records:', error);
      Alert.alert('Error', 'Failed to load donor records. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDonorRecords();
  };
  
  // Open modal to add new donor
  const handleAddDonor = () => {
    // Generate a unique donor ID
    const newDonorId = `DONOR-${Date.now().toString().slice(-6)}`;
    
    setSelectedDonor(null);
    setDonorForm({
      donorId: newDonorId,
      name: '',
      age: '',
      bloodType: 'O+',
      organType: 'Kidney',
      status: 'Available'
    });
    setModalVisible(true);
  };
  
  // Open modal to edit existing donor
  const handleEditDonor = (donor) => {
    setSelectedDonor(donor);
    setDonorForm({
      donorId: donor.donor_id,
      name: donor.name || '',
      age: donor.age ? donor.age.toString() : '',
      bloodType: donor.blood_type || 'O+',
      organType: donor.organ_type || 'Kidney',
      status: donor.status || 'Available'
    });
    setModalVisible(true);
  };
  
  // Handle save donor (add/edit)
  const handleSaveDonor = async () => {
    try {
      // Validate form data
      if (!donorForm.donorId || !donorForm.name || !donorForm.organType) {
        Alert.alert('Validation Error', 'Please fill in all required fields');
        return;
      }
      
      if (donorForm.age && (isNaN(donorForm.age) || parseInt(donorForm.age) <= 0)) {
        Alert.alert('Validation Error', 'Age must be a positive number');
        return;
      }
      
      // Prepare donor data
      const donorData = {
        donor_id: donorForm.donorId,
        hospital_id: hospital?.id || 'unknown',
        name: donorForm.name,
        age: parseInt(donorForm.age) || 0,
        blood_type: donorForm.bloodType,
        organ_type: donorForm.organType,
        status: donorForm.status,
        timestamp: new Date().toISOString()
      };
      
      // Show loading indicator
      setLoading(true);
      
      // Publish to blockchain
      const blockId = await publishOrganRecord(
        donorForm.donorId,
        donorForm.organType,
        donorForm.status
      );
      
      console.log('Organ record published to blockchain:', blockId);
      
      // Close modal
      setModalVisible(false);
      
      // Refresh records
      await loadDonorRecords();
      
      // Show success message
      Alert.alert(
        'Success',
        `Donor record has been ${selectedDonor ? 'updated' : 'added'} and published to the blockchain`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving donor record:', error);
      Alert.alert('Error', `Failed to ${selectedDonor ? 'update' : 'add'} donor record. Please try again.`);
    } finally {
      setLoading(false);
    }
  };
  
  // Render donor item
  const renderDonorItem = ({ item }) => (
    <TouchableOpacity
      style={styles.donorItem}
      onPress={() => handleEditDonor(item)}
    >
      <View style={styles.donorHeader}>
        <Text style={styles.donorId}>{item.donor_id}</Text>
        <View style={[
          styles.statusBadge,
          item.status === 'Available' ? styles.statusAvailable :
          item.status === 'Matched' ? styles.statusMatched :
          item.status === 'Transplanted' ? styles.statusTransplanted :
          styles.statusExpired
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.donorInfo}>
        <Text style={styles.donorName}>{item.name}</Text>
        <View style={styles.donorDetailsRow}>
          <View style={styles.donorDetailItem}>
            <Ionicons name="medical-outline" size={14} color="#64748B" />
            <Text style={styles.donorDetailText}>{item.organ_type}</Text>
          </View>
          
          {item.age && (
            <View style={styles.donorDetailItem}>
              <Ionicons name="calendar-outline" size={14} color="#64748B" />
              <Text style={styles.donorDetailText}>{item.age} years</Text>
            </View>
          )}
          
          {item.blood_type && (
            <View style={styles.donorDetailItem}>
              <Ionicons name="water-outline" size={14} color="#64748B" />
              <Text style={styles.donorDetailText}>{item.blood_type}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.donorFooter}>
        <Text style={styles.donorTimestamp}>
          {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Unknown time'}
        </Text>
        
        {item.blockchain_id && (
          <TouchableOpacity
            style={styles.blockchainButton}
            onPress={() => Alert.alert('Blockchain ID', item.blockchain_id)}
          >
            <Ionicons name="checkmark-circle-outline" size={14} color="#4A6FA5" />
            <Text style={styles.blockchainText}>Verified</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
  
  // Render separator
  const renderSeparator = () => <View style={styles.separator} />;
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="heart-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyStateTitle}>No donor records found</Text>
      <Text style={styles.emptyStateText}>
        Add your first organ donor record to start tracking donations on the blockchain
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={handleAddDonor}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyStateButtonText}>Add Donor</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Organ Donor Registry</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddDonor}
        >
          <Ionicons name="add" size={24} color="#4A6FA5" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search donors by ID, name, or organ type"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A6FA5" />
          <Text style={styles.loadingText}>Loading donor records...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={renderDonorItem}
          keyExtractor={(item) => item.donor_id || item.id || String(Math.random())}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmptyState}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
      
      {/* Add/Edit Donor Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDonor ? 'Edit Donor Record' : 'Add New Donor'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Donor ID</Text>
                <View style={styles.formInput}>
                  <TextInput
                    style={styles.disabledInput}
                    value={donorForm.donorId}
                    editable={false}
                  />
                </View>
                <Text style={styles.formHelperText}>Automatically generated unique ID</Text>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <View style={styles.formInput}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter donor's full name"
                    placeholderTextColor="#94A3B8"
                    value={donorForm.name}
                    onChangeText={(text) => setDonorForm({...donorForm, name: text})}
                  />
                </View>
              </View>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Age</Text>
                  <View style={styles.formInput}>
                    <TextInput
                      style={styles.input}
                      placeholder="Age"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                      value={donorForm.age}
                      onChangeText={(text) => setDonorForm({...donorForm, age: text})}
                    />
                  </View>
                </View>
                
                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Blood Type</Text>
                  <View style={styles.pickerContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.optionsRow}>
                        {bloodTypeOptions.map(option => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.optionButton,
                              donorForm.bloodType === option.value && styles.optionButtonSelected
                            ]}
                            onPress={() => setDonorForm({...donorForm, bloodType: option.value})}
                          >
                            <Text style={[
                              styles.optionButtonText,
                              donorForm.bloodType === option.value && styles.optionButtonTextSelected
                            ]}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Organ Type *</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.optionsRow}>
                      {organTypeOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.optionButton,
                            donorForm.organType === option.value && styles.optionButtonSelected
                          ]}
                          onPress={() => setDonorForm({...donorForm, organType: option.value})}
                        >
                          <Text style={[
                            styles.optionButtonText,
                            donorForm.organType === option.value && styles.optionButtonTextSelected
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status *</Text>
                <View style={styles.statusOptions}>
                  {statusOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusOption,
                        donorForm.status === option.value && styles.statusOptionSelected,
                        donorForm.status === option.value && 
                        (option.value === 'Available' ? styles.statusAvailable :
                         option.value === 'Matched' ? styles.statusMatched :
                         option.value === 'Transplanted' ? styles.statusTransplanted :
                         styles.statusExpired)
                      ]}
                      onPress={() => setDonorForm({...donorForm, status: option.value})}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        donorForm.status === option.value && styles.statusOptionTextSelected
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.formFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveDonor}
                >
                  <Text style={styles.saveButtonText}>
                    {selectedDonor ? 'Update Record' : 'Add to Blockchain'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#0F172A',
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  donorItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  donorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  donorId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A6FA5',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusAvailable: {
    backgroundColor: '#E8F5E9',
  },
  statusMatched: {
    backgroundColor: '#FFF8E1',
  },
  statusTransplanted: {
    backgroundColor: '#E3F2FD',
  },
  statusExpired: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  donorInfo: {
    marginBottom: 8,
  },
  donorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  donorDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  donorDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  donorDetailText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 4,
  },
  donorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  donorTimestamp: {
    fontSize: 12,
    color: '#94A3B8',
  },
  blockchainButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockchainText: {
    fontSize: 12,
    color: '#4A6FA5',
    marginLeft: 4,
  },
  separator: {
    height: 0,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A6FA5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  input: {
    height: 48,
    paddingHorizontal: 12,
    color: '#0F172A',
    fontSize: 14,
  },
  disabledInput: {
    height: 48,
    paddingHorizontal: 12,
    color: '#94A3B8',
    fontSize: 14,
    backgroundColor: '#F1F5F9',
  },
  formHelperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
  },
  optionButtonSelected: {
    backgroundColor: '#4A6FA5',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#64748B',
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statusOption: {
    flex: 1,
    minWidth: '48%',
    margin: 4,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  statusOptionSelected: {
    borderWidth: 2,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  statusOptionTextSelected: {
    color: '#0F172A',
  },
  formFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 12,
    backgroundColor: '#4A6FA5',
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OrganDonorRegistryScreen;