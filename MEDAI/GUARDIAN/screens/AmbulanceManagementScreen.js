import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Dimensions
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { CONFIG } from '../config';

const API_URL = CONFIG?.API_URL || 'http://localhost:3000/api';

const { width, height } = Dimensions.get('window');

const AmbulanceManagementScreen = ({ navigation }) => {
  // State for ambulance list
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // State for hospital data
  const [hospital, setHospital] = useState(null);
  
  // State for add/edit ambulance modal
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedAmbulance, setSelectedAmbulance] = useState(null);
  const [ambulanceForm, setAmbulanceForm] = useState({
    registration_number: '',
    vehicle_type: 'Basic',
    capacity: '2',
    equipment: []
  });
  
  // State for update status modal
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: 'Available',
    latitude: null,
    longitude: null
  });
  
  // Map reference
  const mapRef = useRef(null);
  
  // Vehicle type options
  const vehicleTypeOptions = [
    { value: 'Basic', label: 'Basic' },
    { value: 'Advanced', label: 'Advanced' },
    { value: 'Critical Care', label: 'Critical Care' },
    { value: 'Neonatal', label: 'Neonatal' },
    { value: 'Patient Transfer', label: 'Patient Transfer' }
  ];
  
  // Status options
  const statusOptions = [
    { value: 'Available', label: 'Available', color: '#2A9D8F' },
    { value: 'Dispatched', label: 'Dispatched', color: '#F9A826' },
    { value: 'Returning', label: 'Returning', color: '#4A6FA5' },
    { value: 'Maintenance', label: 'Maintenance', color: '#E57373' }
  ];
  
  // Equipment options
  const equipmentOptions = [
    { id: 'oxygen', label: 'Oxygen Supply' },
    { id: 'ventilator', label: 'Ventilator' },
    { id: 'defibrillator', label: 'Defibrillator' },
    { id: 'monitor', label: 'Patient Monitor' },
    { id: 'suction', label: 'Suction Device' },
    { id: 'stretcher', label: 'Stretcher' },
    { id: 'wheelchair', label: 'Wheelchair' },
    { id: 'iv', label: 'IV Equipment' }
  ];
  
  // Load hospital data and ambulances
  // useEffect(() => {
  //   loadHospitalData();
  // }, []);
  
  // Load ambulances when hospital data is loaded
  useEffect(() => {
    loadAmbulances();
  }, []);
  
  // Load hospital data from storage
  const loadHospitalData = async () => {
    try {
      const hospitalData = await AsyncStorage.getItem('hospitalData');

      console.log("hospital Data", hospitalData)
      // if (hospitalData) {
      //   const parsedData = JSON.parse(hospitalData);
      //   setHospital(parsedData);
      // } else {
      //   // If no hospital data, redirect to login
      //   navigation.replace('HospitalLogin');
      // }
    } catch (error) {
      console.error('Error loading hospital data:', error);
      Alert.alert('Error', 'Failed to load hospital information.');
    }
  };
  
  // Load ambulances for the hospital
  const loadAmbulances = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${API_URL}/hospitals/8c000a74-f9dc-4b2b-a78c-012f50261070/ambulances`);
      setAmbulances(response.data);
    } catch (error) {
      console.error('Error loading ambulances:', error);
      Alert.alert('Error', 'Failed to load ambulance data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAmbulances();
  };
  
  // Open modal to add new ambulance
  const handleAddAmbulance = () => {
    setSelectedAmbulance(null);
    setAmbulanceForm({
      registration_number: '',
      vehicle_type: 'Basic',
      capacity: '2',
      equipment: ['oxygen', 'stretcher']
    });
    setModalVisible(true);
  };
  
  // Open modal to edit existing ambulance
  const handleEditAmbulance = (ambulance) => {
    setSelectedAmbulance(ambulance);
    setAmbulanceForm({
      registration_number: ambulance.registration_number,
      vehicle_type: ambulance.vehicle_type || 'Basic',
      capacity: ambulance.capacity ? ambulance.capacity.toString() : '2',
      equipment: ambulance.equipment || []
    });
    setModalVisible(true);
  };
  
  // Open modal to update ambulance status
  const handleUpdateStatus = async (ambulance) => {
    try {
      setSelectedAmbulance(ambulance);
      
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to update ambulance status with current location.'
        );
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setStatusForm({
        status: ambulance.current_status || 'Available',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      setStatusModalVisible(true);
    } catch (error) {
      console.error('Error getting location:', error);
      
      // Still show the modal, but without location data
      setStatusForm({
        status: ambulance.current_status || 'Available',
        latitude: null,
        longitude: null
      });
      
      setStatusModalVisible(true);
    }
  };
  
  // Toggle equipment selection
  const toggleEquipment = (equipmentId) => {
    if (ambulanceForm.equipment.includes(equipmentId)) {
      setAmbulanceForm({
        ...ambulanceForm,
        equipment: ambulanceForm.equipment.filter(id => id !== equipmentId)
      });
    } else {
      setAmbulanceForm({
        ...ambulanceForm,
        equipment: [...ambulanceForm.equipment, equipmentId]
      });
    }
  };
  
  // Handle save ambulance (add/edit)
  const handleSaveAmbulance = async () => {
    try {
      // Validate form data
      if (!ambulanceForm.registration_number) {
        Alert.alert('Validation Error', 'Registration number is required');
        return;
      }
      
      if (!ambulanceForm.vehicle_type) {
        Alert.alert('Validation Error', 'Vehicle type is required');
        return;
      }
      
      const capacity = parseInt(ambulanceForm.capacity);
      if (isNaN(capacity) || capacity <= 0) {
        Alert.alert('Validation Error', 'Capacity must be a positive number');
        return;
      }
      
      // Show loading indicator
      setLoading(true);
      
      if (selectedAmbulance) {
        // Update existing ambulance
        await axios.put(`${API_URL}/ambulances/${selectedAmbulance.id}`, {
          registration_number: ambulanceForm.registration_number,
          vehicle_type: ambulanceForm.vehicle_type,
          capacity: parseInt(ambulanceForm.capacity),
          equipment: ambulanceForm.equipment
        });
        
        Alert.alert('Success', 'Ambulance updated successfully');
      } else {
        // Add new ambulance
        const ambulanceData = {
            registration_number: ambulanceForm.registration_number,
            vehicle_type: ambulanceForm.vehicle_type,
            capacity: parseInt(ambulanceForm.capacity),
            equipment: ambulanceForm.equipment
        };
        
        // Submit to API
        const response = await fetch(`${API_URL}/hospitals/8c000a74-f9dc-4b2b-a78c-012f50261070/ambulances`, {
          method: 'POST',
          headers: {
            'user-id': 'demo-user', // Replace with actual user ID
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(ambulanceData)
        });


        console.log(response)
        
        Alert.alert('Success', 'Ambulance added successfully and registered on the blockchain');
      }
      
      // Close modal and refresh list
      setModalVisible(false);
      await loadAmbulances();
    } catch (error) {
      console.error('Error saving ambulance:', error);
      
      let errorMessage = 'Failed to save ambulance data. Please try again.';
      
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle update ambulance status
  const handleUpdateAmbulanceStatus = async () => {
    try {
      // Validate form data
      if (!statusForm.status) {
        Alert.alert('Validation Error', 'Status is required');
        return;
      }
      
      // Show loading indicator
      setLoading(true);
      
      // Prepare location data if available
      const locationData = (statusForm.latitude && statusForm.longitude) ? {
        latitude: statusForm.latitude,
        longitude: statusForm.longitude
      } : null;
      
      // Update ambulance status
      await axios.put(`${API_URL}/ambulances/${selectedAmbulance.id}/status`, {
        
        status: statusForm.status,
        location: locationData
      }, {headers: {
        'user-id': 'demo-user', // Replace with actual user ID
        'Content-Type': 'application/json'
      }});
      
      // Close modal and refresh list
      setStatusModalVisible(false);
      await loadAmbulances();
      
      Alert.alert('Success', `Ambulance status updated to ${statusForm.status}`);
    } catch (error) {
      console.error('Error updating ambulance status:', error);
      
      let errorMessage = 'Failed to update ambulance status. Please try again.';
      
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Render ambulance item
  const renderAmbulanceItem = ({ item }) => {
    // Get status color
    const statusInfo = statusOptions.find(option => option.value === item.current_status) || statusOptions[0];
    
    return (
      <View style={styles.ambulanceItem}>
        <View style={styles.ambulanceHeader}>
          <Text style={styles.ambulanceId}>{item.registration_number}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{item.current_status || 'Available'}</Text>
          </View>
        </View>
        
        <View style={styles.ambulanceDetails}>
          <View style={styles.ambulanceDetailRow}>
            <View style={styles.ambulanceDetailItem}>
              <Ionicons name="car-outline" size={16} color="#64748B" />
              <Text style={styles.ambulanceDetailText}>{item.vehicle_type || 'Basic'}</Text>
            </View>
            
            <View style={styles.ambulanceDetailItem}>
              <Ionicons name="people-outline" size={16} color="#64748B" />
              <Text style={styles.ambulanceDetailText}>Capacity: {item.capacity || '2'}</Text>
            </View>
          </View>
          
          {item.equipment && item.equipment.length > 0 && (
            <View style={styles.equipmentContainer}>
              <Text style={styles.equipmentLabel}>Equipment:</Text>
              <View style={styles.equipmentList}>
                {item.equipment.map((eq, index) => {
                  // Find equipment label from options
                  const equipment = equipmentOptions.find(option => option.id === eq);
                  return (
                    <View key={index} style={styles.equipmentItem}>
                      <Ionicons name="medical-outline" size={12} color="#4A6FA5" />
                      <Text style={styles.equipmentText}>
                        {equipment ? equipment.label : eq}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          
          {item.current_location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={16} color="#64748B" />
              <Text style={styles.locationText}>
                {item.current_location.latitude.toFixed(4)}, {item.current_location.longitude.toFixed(4)}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.ambulanceFooter}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditAmbulance(item)}
          >
            <Ionicons name="create-outline" size={16} color="#4A6FA5" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.statusButton]}
            onPress={() => handleUpdateStatus(item)}
          >
            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
            <Text style={styles.statusButtonText}>Update Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Render separator
  const renderSeparator = () => <View style={styles.separator} />;
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="car-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyStateTitle}>No ambulances registered</Text>
      <Text style={styles.emptyStateText}>
        Add your first ambulance to start tracking and managing your fleet on the blockchain
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={handleAddAmbulance}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyStateButtonText}>Add Ambulance</Text>
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
        <Text style={styles.headerTitle}>Ambulance Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddAmbulance}
        >
          <Ionicons name="add" size={24} color="#4A6FA5" />
        </TouchableOpacity>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A6FA5" />
          <Text style={styles.loadingText}>Loading ambulance data...</Text>
        </View>
      ) : (
        <FlatList
          data={ambulances}
          renderItem={renderAmbulanceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={renderSeparator}
          ListEmptyComponent={renderEmptyState}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
      
      {/* Add/Edit Ambulance Modal */}
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
                {selectedAmbulance ? 'Edit Ambulance' : 'Add New Ambulance'}
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
                <Text style={styles.formLabel}>Registration Number *</Text>
                <View style={styles.formInput}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter vehicle registration number"
                    placeholderTextColor="#94A3B8"
                    value={ambulanceForm.registration_number}
                    onChangeText={(text) => setAmbulanceForm({...ambulanceForm, registration_number: text})}
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Vehicle Type *</Text>
                <View style={styles.pickerContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.optionsRow}>
                      {vehicleTypeOptions.map(option => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.optionButton,
                            ambulanceForm.vehicle_type === option.value && styles.optionButtonSelected
                          ]}
                          onPress={() => setAmbulanceForm({...ambulanceForm, vehicle_type: option.value})}
                        >
                          <Text style={[
                            styles.optionButtonText,
                            ambulanceForm.vehicle_type === option.value && styles.optionButtonTextSelected
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
                <Text style={styles.formLabel}>Capacity (Number of Patients) *</Text>
                <View style={styles.formInput}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter capacity"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={ambulanceForm.capacity}
                    onChangeText={(text) => setAmbulanceForm({...ambulanceForm, capacity: text})}
                  />
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Equipment</Text>
                <Text style={styles.formHelperText}>Select all equipment available in this ambulance</Text>
                
                <View style={styles.equipmentOptions}>
                  {equipmentOptions.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.equipmentOption}
                      onPress={() => toggleEquipment(option.id)}
                    >
                      <View style={[
                        styles.equipmentCheckbox,
                        ambulanceForm.equipment.includes(option.id) && styles.equipmentCheckboxSelected
                      ]}>
                        {ambulanceForm.equipment.includes(option.id) && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={styles.equipmentOptionText}>{option.label}</Text>
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
                  onPress={handleSaveAmbulance}
                >
                  <Text style={styles.saveButtonText}>
                    {selectedAmbulance ? 'Update Ambulance' : 'Add to Blockchain'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Update Status Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Ambulance Status</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setStatusModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {selectedAmbulance && (
                <View style={styles.selectedAmbulanceInfo}>
                  <Text style={styles.selectedAmbulanceTitle}>{selectedAmbulance.registration_number}</Text>
                  <Text style={styles.selectedAmbulanceSubtitle}>{selectedAmbulance.vehicle_type || 'Basic'}</Text>
                </View>
              )}
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Current Status *</Text>
                <View style={styles.statusOptions}>
                  {statusOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusOption,
                        statusForm.status === option.value && styles.statusOptionSelected,
                        statusForm.status === option.value && { borderColor: option.color }
                      ]}
                      onPress={() => setStatusForm({...statusForm, status: option.value})}
                    >
                      <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                      <Text style={styles.statusOptionText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Current Location</Text>
                
                {statusForm.latitude && statusForm.longitude ? (
                  <View style={styles.mapContainer}>
                    <MapView
                      ref={mapRef}
                      style={styles.map}
                      provider={PROVIDER_GOOGLE}
                      initialRegion={{
                        latitude: statusForm.latitude,
                        longitude: statusForm.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01
                      }}
                    >
                      <Marker
                        coordinate={{
                          latitude: statusForm.latitude,
                          longitude: statusForm.longitude
                        }}
                      >
                        <View style={styles.markerContainer}>
                          <Ionicons name="car" size={20} color="#FFFFFF" />
                        </View>
                      </Marker>
                    </MapView>
                    
                    <View style={styles.coordinatesContainer}>
                      <Text style={styles.coordinatesText}>
                        Lat: {statusForm.latitude.toFixed(6)}, Lng: {statusForm.longitude.toFixed(6)}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noLocationContainer}>
                    <Ionicons name="location-off-outline" size={48} color="#CBD5E1" />
                    <Text style={styles.noLocationText}>Location data not available</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.formFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setStatusModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateAmbulanceStatus}
                >
                  <Text style={styles.saveButtonText}>Update Status</Text>
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
  ambulanceItem: {
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
  ambulanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ambulanceId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ambulanceDetails: {
    marginBottom: 12,
  },
  ambulanceDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ambulanceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ambulanceDetailText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  equipmentContainer: {
    marginTop: 4,
  },
  equipmentLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  equipmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  equipmentText: {
    fontSize: 12,
    color: '#334155',
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 6,
  },
  ambulanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: '#F1F5F9',
  },
  editButtonText: {
    fontSize: 14,
    color: '#4A6FA5',
    marginLeft: 6,
  },
  statusButton: {
    backgroundColor: '#4A6FA5',
  },
  statusButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 6,
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
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8,
  },
  formHelperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
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
  equipmentOptions: {
    marginTop: 8,
  },
  equipmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  equipmentCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  equipmentCheckboxSelected: {
    backgroundColor: '#4A6FA5',
    borderColor: '#4A6FA5',
  },
  equipmentOptionText: {
    fontSize: 14,
    color: '#334155',
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
  selectedAmbulanceInfo: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedAmbulanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  selectedAmbulanceSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    margin: 4,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusOptionSelected: {
    borderWidth: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A6FA5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  coordinatesContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
  },
  noLocationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 24,
    borderRadius: 8,
  },
  noLocationText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
});

export default AmbulanceManagementScreen;