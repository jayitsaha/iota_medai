// src/screens/alzheimers/OrganDonationScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  TextInput,
  SafeAreaView,
  Switch,
  FlatList,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../../constants/theme';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

// Import the organ service
import OrganService from '../../services/OrganService';
import WalletService from '../../services/walletService';

const { width } = Dimensions.get('window');

const OrganDonationScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [organRequests, setOrganRequests] = useState([]);
  const [availableOrgans, setAvailableOrgans] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [organStats, setOrganStats] = useState(null);
  const [selectedOrgan, setSelectedOrgan] = useState(null);
  const [organTypeFilter, setOrganTypeFilter] = useState('all');
  const [hasActiveDonation, setHasActiveDonation] = useState(false);
  const [donorInfo, setDonorInfo] = useState(null);
  const [requestDetails, setRequestDetails] = useState({
    organType: '',
    urgency: 'medium',
    additionalInfo: '',
    consentGiven: false
  });
  
  // Define available organ types
  const organTypes = [
    { id: 'heart', name: 'Heart', icon: 'heart-outline', color: '#FB6340' },
    { id: 'kidney', name: 'Kidney', icon: 'fitness-outline', color: '#11CDEF' },
    { id: 'liver', name: 'Liver', icon: 'body-outline', color: '#2DCE89' },
    { id: 'lung', name: 'Lung', icon: 'medical-outline', color: '#5E72E4' },
    { id: 'cornea', name: 'Cornea', icon: 'eye-outline', color: '#6A5ACD' },
    { id: 'bone_marrow', name: 'Bone Marrow', icon: 'flask-outline', color: '#F5A623' }
  ];

  // Load patient ID and data on mount
  useEffect(() => {
    loadPatientId();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (patientId) {
        loadUserData();
        fetchOrganStats();
        fetchAvailableOrgans();
      }
    }, [patientId])
  );

  const loadPatientId = async () => {
    try {
      const id = await AsyncStorage.getItem('user_id');
      if (id) {
        setPatientId(id);
      } else {
        // For development/testing, set a default patient ID
        const defaultId = 'patient_' + Math.random().toString(36).substring(2, 9);
        await AsyncStorage.setItem('user_id', defaultId);
        setPatientId(defaultId);
      }
    } catch (error) {
      console.error('Error loading patient ID:', error);
      Alert.alert('Error', 'Could not load patient information');
    }
  };

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user's organ requests
      const requests = await OrganService.fetchUserOrganRequests(patientId);
      setOrganRequests(requests);
      
      // Check if user is a registered donor
      const donor = await OrganService.getDonorInfo(patientId);
      setDonorInfo(donor);
      
      // Check if user has any active donations
      const activeDonation = await OrganService.checkActiveDonation(patientId);
      setHasActiveDonation(activeDonation);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const fetchOrganStats = async () => {
    try {
      const stats = await OrganService.fetchOrganStatistics();
      setOrganStats(stats);
    } catch (error) {
      console.error('Error fetching organ statistics:', error);
    }
  };

  const fetchAvailableOrgans = async () => {
    try {
      const organs = await OrganService.fetchAvailableOrgans();
      setAvailableOrgans(organs);
    } catch (error) {
      console.error('Error fetching available organs:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadUserData(),
      fetchOrganStats(),
      fetchAvailableOrgans()
    ]);
    setRefreshing(false);
  };

  const handleRegisterAsDonor = async () => {
    try {
      setLoading(true);
      
      // Verify user has a wallet for blockchain transactions
      const hasWallet = await WalletService.checkWalletExists();
      
      if (!hasWallet) {
        Alert.alert(
          'Wallet Required',
          'You need a blockchain wallet to register as an organ donor. This ensures transparent and secure records.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Create Wallet', 
              onPress: async () => {
                // Navigate to wallet setup
                navigation.navigate('Wallet');
              }
            }
          ]
        );
        setLoading(false);
        return;
      }
      
      // Register user as a donor
      const result = await OrganService.registerAsDonor(patientId);
      
      if (result.success) {
        // Update donor info
        setDonorInfo(result.donorInfo);
        
        Alert.alert(
          'Registration Successful',
          'You have been registered as an organ donor. Thank you for your generosity!'
        );
      } else {
        Alert.alert('Registration Failed', result.error || 'An unknown error occurred');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error registering as donor:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to register as donor. Please try again.');
    }
  };

  const handleViewOrganDetails = (organ) => {
    setSelectedOrgan(organ);
    setModalVisible(true);
  };

  const handleRequestOrgan = (organType) => {
    setRequestDetails({
      ...requestDetails,
      organType: organType || ''
    });
    setRequestModalVisible(true);
  };

  const submitOrganRequest = async () => {
    try {
      if (!requestDetails.organType) {
        Alert.alert('Error', 'Please select an organ type');
        return;
      }
      
      if (!requestDetails.consentGiven) {
        Alert.alert('Consent Required', 'You must consent to the terms and conditions');
        return;
      }
      
      setLoading(true);
      
      // Submit organ request
      const result = await OrganService.submitOrganRequest(
        patientId,
        requestDetails.organType,
        requestDetails.urgency,
        requestDetails.additionalInfo
      );
      
      if (result.success) {
        // Update requests list
        setOrganRequests([...organRequests, result.request]);
        
        setRequestModalVisible(false);
        Alert.alert(
          'Request Submitted',
          'Your organ request has been submitted successfully.'
        );
      } else {
        Alert.alert('Submission Failed', result.error || 'An unknown error occurred');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error submitting organ request:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    }
  };

  const calculateUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'high':
        return '#FB6340';
      case 'medium':
        return '#F5A623';
      case 'low':
        return '#2DCE89';
      default:
        return '#6A5ACD';
    }
  };

  const calculateStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#F5A623';
      case 'approved':
        return '#2DCE89';
      case 'matched':
        return '#5E72E4';
      case 'transplanted':
        return '#6A5ACD';
      case 'rejected':
        return '#FB6340';
      default:
        return '#6A5ACD';
    }
  };

  const renderOrganTypeCard = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.organTypeCard,
        organTypeFilter === item.id && { backgroundColor: item.color + '20' }
      ]}
      onPress={() => setOrganTypeFilter(organTypeFilter === item.id ? 'all' : item.id)}
    >
      <View style={[styles.organTypeIconContainer, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon} size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.organTypeName}>{item.name}</Text>
      <Text style={styles.organTypeCount}>
        {availableOrgans.filter(o => o.organType === item.id).length}
      </Text>
    </TouchableOpacity>
  );

  const renderRequestItem = ({ item }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={[styles.organIconContainer, { backgroundColor: calculateUrgencyColor(item.urgency) }]}>
          <Ionicons 
            name={organTypes.find(o => o.id === item.organType)?.icon || 'medical'} 
            size={24} 
            color="#FFFFFF" 
          />
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.organTypeName}>
            {organTypes.find(o => o.id === item.organType)?.name || item.organType}
          </Text>
          <Text style={styles.requestDate}>
            Requested on {new Date(item.requestDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: calculateStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Urgency:</Text>
          <View style={[styles.urgencyBadge, { backgroundColor: calculateUrgencyColor(item.urgency) + '20' }]}>
            <Text style={[styles.urgencyText, { color: calculateUrgencyColor(item.urgency) }]}>
              {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)}
            </Text>
          </View>
        </View>
        
        {item.matchDate && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Match Date:</Text>
            <Text style={styles.detailValue}>{new Date(item.matchDate).toLocaleDateString()}</Text>
          </View>
        )}
        
        {item.additionalInfo && (
          <View style={styles.additionalInfo}>
            <Text style={styles.additionalInfoText}>{item.additionalInfo}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.requestFooter}>
        <TouchableOpacity style={styles.blockchainButton}>
          <Ionicons name="cube-outline" size={16} color="#6A5ACD" />
          <Text style={styles.blockchainButtonText}>View on Blockchain</Text>
        </TouchableOpacity>
        
        {item.status === 'pending' && (
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderAvailableOrganItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.availableOrganCard}
      onPress={() => handleViewOrganDetails(item)}
    >
      <View style={styles.availableOrganHeader}>
        <View style={[
          styles.organIconContainer, 
          { backgroundColor: organTypes.find(o => o.id === item.organType)?.color || '#6A5ACD' }
        ]}>
          <Ionicons 
            name={organTypes.find(o => o.id === item.organType)?.icon || 'medical'} 
            size={24} 
            color="#FFFFFF" 
          />
        </View>
        <View style={styles.availableOrganInfo}>
          <Text style={styles.availableOrganName}>
            {organTypes.find(o => o.id === item.organType)?.name || item.organType}
          </Text>
          <Text style={styles.availableOrganLocation}>{item.location}</Text>
        </View>
        <View style={styles.compatibilityBadge}>
          <Text style={styles.compatibilityText}>{item.bloodType}</Text>
        </View>
      </View>
      
      <View style={styles.availableOrganDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Available Since:</Text>
          <Text style={styles.detailValue}>{new Date(item.availableSince).toLocaleDateString()}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Preservation Time:</Text>
          <Text style={styles.detailValue}>{item.preservationHours} hours remaining</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Distance:</Text>
          <Text style={styles.detailValue}>{item.distance} km away</Text>
        </View>
      </View>
      
      <View style={styles.availableOrganFooter}>
        <View style={styles.matchScore}>
          <Text style={styles.matchScoreLabel}>Match Score:</Text>
          <View style={styles.matchScoreBar}>
            <View 
              style={[
                styles.matchScoreProgress, 
                { 
                  width: `${item.matchScore}%`,
                  backgroundColor: item.matchScore > 70 ? '#2DCE89' : item.matchScore > 40 ? '#F5A623' : '#FB6340'
                }
              ]} 
            />
          </View>
          <Text style={styles.matchScoreValue}>{item.matchScore}%</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.requestButton}
          onPress={() => handleRequestOrgan(item.organType)}
        >
          <Text style={styles.requestButtonText}>Request</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderDonorCard = () => {
    if (!donorInfo) return null;
    
    return (
      <View style={styles.donorCard}>
        <View style={styles.donorHeader}>
          <Ionicons name="heart-circle" size={32} color="#FB6340" />
          <View style={styles.donorInfo}>
            <Text style={styles.donorTitle}>Registered Organ Donor</Text>
            <Text style={styles.donorSubtitle}>
              Registered on {new Date(donorInfo.registrationDate).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.donorContent}>
          <Text style={styles.donorMessage}>
            Thank you for being an organ donor! Your generosity could save up to 8 lives.
          </Text>
          
          <View style={styles.donatedOrgans}>
            {donorInfo.organs.map((organ, index) => (
              <View key={index} style={styles.donatedOrgan}>
                <Ionicons 
                  name={organTypes.find(o => o.id === organ)?.icon || 'medical'} 
                  size={20} 
                  color={organTypes.find(o => o.id === organ)?.color || '#6A5ACD'} 
                />
                <Text style={styles.donatedOrganText}>
                  {organTypes.find(o => o.id === organ)?.name || organ}
                </Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={styles.donorFooter}>
          <TouchableOpacity style={styles.blockchainButton}>
            <Ionicons name="cube-outline" size={16} color="#6A5ACD" />
            <Text style={styles.blockchainButtonText}>View on Blockchain</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderDetailsModal = () => {
    if (!selectedOrgan) return null;
    
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
              <Text style={styles.modalTitle}>Organ Details</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.organDetailHeader}>
                <View style={[
                  styles.organDetailIconContainer, 
                  { 
                    backgroundColor: organTypes.find(o => o.id === selectedOrgan.organType)?.color || '#6A5ACD' 
                  }
                ]}>
                  <Ionicons 
                    name={organTypes.find(o => o.id === selectedOrgan.organType)?.icon || 'medical'} 
                    size={40} 
                    color="#FFFFFF" 
                  />
                </View>
                <Text style={styles.organDetailTitle}>
                  {organTypes.find(o => o.id === selectedOrgan.organType)?.name || selectedOrgan.organType}
                </Text>
                <Text style={styles.organDetailLocation}>{selectedOrgan.location}</Text>
              </View>
              
              <View style={styles.matchScoreSection}>
                <Text style={styles.matchScoreTitle}>Match Score</Text>
                <View style={styles.matchScoreCircle}>
                  <Text style={styles.matchScoreCircleText}>{selectedOrgan.matchScore}%</Text>
                </View>
                <Text style={styles.matchScoreDescription}>
                  This score indicates how well this organ matches your medical profile and needs.
                </Text>
              </View>
              
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Organ Information</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Donor Age:</Text>
                  <Text style={styles.detailValue}>{selectedOrgan.donorAge} years</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Blood Type:</Text>
                  <Text style={styles.detailValue}>{selectedOrgan.bloodType}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Available Since:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedOrgan.availableSince).toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Preservation Time:</Text>
                  <Text style={styles.detailValue}>{selectedOrgan.preservationHours} hours remaining</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Distance:</Text>
                  <Text style={styles.detailValue}>{selectedOrgan.distance} km away</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Transport Time:</Text>
                  <Text style={styles.detailValue}>{selectedOrgan.transportTime} minutes</Text>
                </View>
              </View>
              
              <View style={styles.compatibilitySection}>
                <Text style={styles.sectionTitle}>Compatibility Factors</Text>
                
                <View style={styles.compatibilityRow}>
                  <Text style={styles.compatibilityLabel}>Blood Type Match:</Text>
                  <View style={[
                    styles.compatibilityIndicator,
                    { backgroundColor: selectedOrgan.bloodTypeCompatible ? '#2DCE89' : '#FB6340' }
                  ]}>
                    <Ionicons 
                      name={selectedOrgan.bloodTypeCompatible ? 'checkmark' : 'close'} 
                      size={16} 
                      color="#FFFFFF" 
                    />
                  </View>
                </View>
                
                <View style={styles.compatibilityRow}>
                  <Text style={styles.compatibilityLabel}>Tissue Type Match:</Text>
                  <View style={[
                    styles.compatibilityIndicator,
                    { backgroundColor: selectedOrgan.tissueTypeScore > 70 ? '#2DCE89' : '#F5A623' }
                  ]}>
                    <Text style={styles.compatibilityScore}>{selectedOrgan.tissueTypeScore}%</Text>
                  </View>
                </View>
                
                <View style={styles.compatibilityRow}>
                  <Text style={styles.compatibilityLabel}>Size Match:</Text>
                  <View style={[
                    styles.compatibilityIndicator,
                    { backgroundColor: selectedOrgan.sizeMatch ? '#2DCE89' : '#F5A623' }
                  ]}>
                    <Ionicons 
                      name={selectedOrgan.sizeMatch ? 'checkmark' : 'alert'} 
                      size={16} 
                      color="#FFFFFF" 
                    />
                  </View>
                </View>
              </View>
              
              <View style={styles.blockchainSection}>
                <View style={styles.blockchainHeader}>
                  <Ionicons name="cube" size={24} color="#6A5ACD" />
                  <Text style={styles.blockchainTitle}>Blockchain Verified</Text>
                </View>
                <Text style={styles.blockchainDescription}>
                  This organ donation record is secured and verified on the blockchain, 
                  ensuring transparency and traceability.
                </Text>
                <TouchableOpacity style={styles.viewTransactionButton}>
                  <Text style={styles.viewTransactionText}>View Transaction</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.requestNowButton}
                  onPress={() => {
                    setModalVisible(false);
                    handleRequestOrgan(selectedOrgan.organType);
                  }}
                >
                  <Text style={styles.requestNowButtonText}>Request This Organ</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={() => {
                    setModalVisible(false);
                    Alert.alert(
                      'Contact Information',
                      `For more information about this organ, please contact:\n\nTransplant Coordinator\nPhone: +1-555-123-4567\nEmail: transplant@hospital.org`
                    );
                  }}
                >
                  <Text style={styles.contactButtonText}>Contact Transplant Center</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderRequestModal = () => {
    return (
      <Modal
        visible={requestModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Organ</Text>
              <TouchableOpacity 
                onPress={() => setRequestModalVisible(false)}
                hitSlop={{top: 20, bottom: 20, left: 20, right: 20}}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.requestFormSection}>
                <Text style={styles.formLabel}>Organ Type *</Text>
                <View style={styles.organTypeSelector}>
                  {organTypes.map((organ) => (
                    <TouchableOpacity
                      key={organ.id}
                      style={[
                        styles.organTypeOption,
                        requestDetails.organType === organ.id && { 
                          backgroundColor: organ.color + '20',
                          borderColor: organ.color
                        }
                      ]}
                      onPress={() => setRequestDetails({
                        ...requestDetails,
                        organType: organ.id
                      })}
                    >
                      <Ionicons
                        name={organ.icon}
                        size={24}
                        color={organ.color}
                      />
                      <Text style={styles.organTypeOptionText}>{organ.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <Text style={styles.formLabel}>Urgency Level *</Text>
                <View style={styles.urgencySelector}>
                  <TouchableOpacity
                    style={[
                      styles.urgencyOption,
                      requestDetails.urgency === 'low' && styles.urgencyOptionSelected,
                      { borderColor: '#2DCE89' }
                    ]}
                    onPress={() => setRequestDetails({
                      ...requestDetails,
                      urgency: 'low'
                    })}
                  >
                    <Text style={[
                      styles.urgencyOptionText,
                      requestDetails.urgency === 'low' && styles.urgencyOptionTextSelected,
                      { color: '#2DCE89' }
                    ]}>
                      Low
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.urgencyOption,
                      requestDetails.urgency === 'medium' && styles.urgencyOptionSelected,
                      { borderColor: '#F5A623' }
                    ]}
                    onPress={() => setRequestDetails({
                      ...requestDetails,
                      urgency: 'medium'
                    })}
                  >
                    <Text style={[
                      styles.urgencyOptionText,
                      requestDetails.urgency === 'medium' && styles.urgencyOptionTextSelected,
                      { color: '#F5A623' }
                    ]}>
                      Medium
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.urgencyOption,
                      requestDetails.urgency === 'high' && styles.urgencyOptionSelected,
                      { borderColor: '#FB6340' }
                    ]}
                    onPress={() => setRequestDetails({
                      ...requestDetails,
                      urgency: 'high'
                    })}
                  >
                    <Text style={[
                      styles.urgencyOptionText,
                      requestDetails.urgency === 'high' && styles.urgencyOptionTextSelected,
                      { color: '#FB6340' }
                    ]}>
                      High
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.formLabel}>Additional Information</Text>
                <TextInput
                  style={styles.additionalInfoInput}
                  placeholder="Add any additional information that may be relevant to your request"
                  value={requestDetails.additionalInfo}
                  onChangeText={(text) => setRequestDetails({
                    ...requestDetails,
                    additionalInfo: text
                  })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                
                <View style={styles.consentContainer}>
                  <View style={styles.consentRow}>
                    <Switch
                      value={requestDetails.consentGiven}
                      onValueChange={(value) => setRequestDetails({
                        ...requestDetails,
                        consentGiven: value
                      })}
                      trackColor={{ false: '#D1D1D1', true: '#BEB7E2' }}
                      thumbColor={requestDetails.consentGiven ? '#6A5ACD' : '#F4F3F4'}
                    />
                    <Text style={styles.consentText}>
                      I consent to sharing my medical information with organ donation centers
                    </Text>
                  </View>
                  <Text style={styles.consentDescription}>
                    Your medical information will be securely stored on the blockchain
                    and only accessible to authorized medical professionals.
                  </Text>
                </View>
              </View>
              
              <View style={styles.requestFormActions}>
                <TouchableOpacity
                  style={styles.cancelRequestButton}
                  onPress={() => setRequestModalVisible(false)}
                >
                  <Text style={styles.cancelRequestButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.submitRequestButton,
                    (!requestDetails.organType || !requestDetails.consentGiven) && 
                    styles.submitRequestButtonDisabled
                  ]}
                  onPress={submitOrganRequest}
                  disabled={!requestDetails.organType || !requestDetails.consentGiven}
                >
                  <Text style={styles.submitRequestButtonText}>Submit Request</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6A5ACD']} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Organ Donation & Requests</Text>
        </View>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6A5ACD" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <>
            {/* Donor Registration Card */}
            {!donorInfo ? (
              <View style={styles.donorRegistrationCard}>
                {/* <Image
                  source={require('../../assets/images/donor-illustration.png')}
                  style={styles.donorIllustration}
                  resizeMode="contain"
                /> */}
                <Text style={styles.donorRegistrationTitle}>Become an Organ Donor</Text>
                <Text style={styles.donorRegistrationDescription}>
                  Your decision to become an organ donor could save up to 8 lives and enhance the lives of up to 75 people.
                </Text>
                <TouchableOpacity
                  style={styles.registerButton}
                  onPress={handleRegisterAsDonor}
                >
                  <Text style={styles.registerButtonText}>Register as Donor</Text>
                </TouchableOpacity>
              </View>
            ) : (
              renderDonorCard()
            )}
            
            {/* Statistics Section */}
            {organStats && (
              <View style={styles.statsSection}>
                <Text style={styles.sectionTitle}>Organ Donation Statistics</Text>
                <View style={styles.statsCards}>
                  <View style={styles.statsCard}>
                    <Text style={styles.statsValue}>{organStats.waitingPatients.toLocaleString()}</Text>
                    <Text style={styles.statsLabel}>Waiting for Transplants</Text>
                  </View>
                  
                  <View style={styles.statsCard}>
                    <Text style={styles.statsValue}>{organStats.transplantsDone.toLocaleString()}</Text>
                    <Text style={styles.statsLabel}>Transplants This Year</Text>
                  </View>
                  
                  <View style={styles.statsCard}>
                    <Text style={styles.statsValue}>{organStats.registeredDonors.toLocaleString()}</Text>
                    <Text style={styles.statsLabel}>Registered Donors</Text>
                  </View>
                </View>
                
                <Text style={styles.chartTitle}>Monthly Transplants</Text>
                <LineChart
                  data={{
                    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                    datasets: [
                      {
                        data: organStats.monthlyTransplants || [20, 45, 28, 80, 99, 43]
                      }
                    ]
                  }}
                  width={width - 40}
                  height={220}
                  chartConfig={{
                    backgroundColor: "#FFFFFF",
                    backgroundGradientFrom: "#FFFFFF",
                    backgroundGradientTo: "#FFFFFF",
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(106, 90, 205, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16
                    },
                    propsForDots: {
                      r: "6",
                      strokeWidth: "2",
                      stroke: "#6A5ACD"
                    }
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}
            
            {/* My Organ Requests Section */}
            <View style={styles.requestsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>My Organ Requests</Text>
                <TouchableOpacity 
                  style={styles.addRequestButton}
                  onPress={() => handleRequestOrgan()}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addRequestButtonText}>New Request</Text>
                </TouchableOpacity>
              </View>
              
              {organRequests.length === 0 ? (
                <View style={styles.emptyRequests}>
                  <Ionicons name="document-text-outline" size={48} color="#DDD" />
                  <Text style={styles.emptyRequestsText}>No organ requests yet</Text>
                  <Text style={styles.emptyRequestsSubtext}>
                    Tap the "New Request" button to submit a new organ request
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={organRequests}
                  renderItem={renderRequestItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                />
              )}
            </View>
            
            {/* Available Organs Section */}
            <View style={styles.availableOrgansSection}>
              <Text style={styles.sectionTitle}>Available Organs</Text>
              
              <FlatList
                data={organTypes}
                renderItem={renderOrganTypeCard}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.organTypesList}
              />
              
              {availableOrgans.length === 0 ? (
                <View style={styles.emptyOrgans}>
                  <Ionicons name="search-outline" size={48} color="#DDD" />
                  <Text style={styles.emptyOrgansText}>No available organs found</Text>
                  <Text style={styles.emptyOrgansSubtext}>
                    Check back later or create a request to be notified when organs become available
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={organTypeFilter === 'all' 
                    ? availableOrgans 
                    : availableOrgans.filter(o => o.organType === organTypeFilter)}
                  renderItem={renderAvailableOrganItem}
                  keyExtractor={item => item.id}
                  scrollEnabled={false}
                  ListEmptyComponent={() => (
                    <View style={styles.emptyOrgans}>
                      <Ionicons name="search-outline" size={48} color="#DDD" />
                      <Text style={styles.emptyOrgansText}>
                        No {organTypes.find(o => o.id === organTypeFilter)?.name || ''} organs available
                      </Text>
                      <Text style={styles.emptyOrgansSubtext}>
                        Try selecting a different organ type or check back later
                      </Text>
                    </View>
                  )}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
      
      {/* Render modals */}
      {renderDetailsModal()}
      {renderRequestModal()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  donorRegistrationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  donorIllustration: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  donorRegistrationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  donorRegistrationDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  registerButton: {
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  donorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  donorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  donorInfo: {
    marginLeft: 15,
    flex: 1,
  },
  donorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  donorSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  donorContent: {
    marginBottom: 15,
  },
  donorMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  donatedOrgans: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  donatedOrgan: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  donatedOrganText: {
    fontSize: 12,
    color: '#6A5ACD',
    marginLeft: 5,
  },
  donorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 15,
  },
  blockchainButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockchainButtonText: {
    fontSize: 14,
    color: '#6A5ACD',
    marginLeft: 5,
  },
  editButton: {
    backgroundColor: '#F0F0FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: '#6A5ACD',
    fontWeight: '600',
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    width: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6A5ACD',
    marginBottom: 5,
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  requestsSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A5ACD',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addRequestButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyRequests: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyRequestsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyRequestsSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  organIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestDate: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    width: 120,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  urgencyBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  additionalInfo: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
  },
  additionalInfoText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F8F8F8',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
  },
  availableOrgansSection: {
    padding: 20,
  },
  organTypesList: {
    paddingBottom: 15,
  },
  organTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  organTypeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  organTypeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  organTypeCount: {
    fontSize: 12,
    color: '#666',
  },
  emptyOrgans: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyOrgansText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyOrgansSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  availableOrganCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  availableOrganHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  availableOrganInfo: {
    flex: 1,
    marginLeft: 12,
  },
  availableOrganLocation: {
    fontSize: 14,
    color: '#666',
  },
  compatibilityBadge: {
    backgroundColor: '#F0F0FF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  compatibilityText: {
    fontSize: 14,
    color: '#6A5ACD',
    fontWeight: '600',
  },
  availableOrganDetails: {
    marginBottom: 12,
  },
  availableOrganFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  matchScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchScoreLabel: {
    fontSize: 14,
    color: '#666',
    width: 100,
  },
  matchScoreBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  matchScoreProgress: {
    height: '100%',
    borderRadius: 4,
  },
  matchScoreValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 40,
    textAlign: 'right',
  },
  requestButton: {
    backgroundColor: '#6A5ACD',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
  organDetailHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  organDetailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  organDetailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  organDetailLocation: {
    fontSize: 16,
    color: '#666',
  },
  matchScoreSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  matchScoreTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  matchScoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 4,
    borderColor: '#6A5ACD',
  },
  matchScoreCircleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6A5ACD',
  },
  matchScoreDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 300,
  },
  detailsSection: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  compatibilitySection: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  compatibilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  compatibilityLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  compatibilityIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compatibilityScore: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  blockchainSection: {
    backgroundColor: '#F0F0FF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  blockchainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  blockchainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6A5ACD',
    marginLeft: 10,
  },
  blockchainDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  viewTransactionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6A5ACD',
  },
  viewTransactionText: {
    fontSize: 14,
    color: '#6A5ACD',
    fontWeight: '600',
  },
  actionButtons: {
    marginTop: 10,
    marginBottom: 20,
  },
  requestNowButton: {
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  requestNowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactButton: {
    backgroundColor: '#F0F0FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6A5ACD',
  },
  // Request form styles
  requestFormSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  organTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  organTypeOption: {
    width: '31%',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: '2%',
    marginBottom: 10,
  },
  organTypeOptionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
    textAlign: 'center',
  },
  urgencySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  urgencyOption: {
    width: '31%',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  urgencyOptionSelected: {
    backgroundColor: '#F0F0FF',
  },
  urgencyOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  urgencyOptionTextSelected: {
    color: '#FFFFFF',
  },
  additionalInfoInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    height: 100,
    marginBottom: 20,
    fontSize: 14,
    color: '#333',
  },
  consentContainer: {
    marginBottom: 20,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  consentText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginLeft: 10,
  },
  consentDescription: {
    fontSize: 12,
    color: '#666',
    marginLeft: 45,
  },
  requestFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelRequestButton: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  cancelRequestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitRequestButton: {
    backgroundColor: '#6A5ACD',
    paddingVertical: 12,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  submitRequestButtonDisabled: {
    backgroundColor: '#BEB7E2',
  },
  submitRequestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default OrganDonationScreen;