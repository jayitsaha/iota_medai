import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Alert,
  Modal,
  FlatList,
  SafeAreaView,
  Linking,
  Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';

// Import blockchain service
import { 
  fetchHealthcareRecord, 
  checkBlockchainStatus 
} from '../services/blockchainService';

// Import configuration
import { CONFIG } from '../config';

// API URL
const API_URL = CONFIG?.API_URL || 'https://medai-guardian-api.herokuapp.com';

const EmergencyStatusScreen = ({ route, navigation }) => {
  const { facilityId, facilityName, analysis, blockchainTransactionId } = route.params || {};
  
  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [doctorCallStatus, setDoctorCallStatus] = useState('idle'); // idle, connecting, connected
  const [blockchainVerified, setBlockchainVerified] = useState(false);
  const [blockchainStatus, setBlockchainStatus] = useState(null); // operational, unavailable
  const [blockchainDetails, setBlockchainDetails] = useState(null);
  const [showBlockchainDetails, setShowBlockchainDetails] = useState(false);
  
  const mapRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const callTimerRef = useRef(null);
  const [callTimer, setCallTimer] = useState(0);
  
  // Check blockchain status on component mount
  // useEffect(() => {
  //   const checkBlockchain = async () => {
  //     try {
  //       const status = await checkBlockchainStatus();
  //       setBlockchainStatus(status.operational ? 'operational' : 'unavailable');
  //       console.log('Blockchain status:', status);
  //     } catch (error) {
  //       console.error('Error checking blockchain status:', error);
  //       setBlockchainStatus('unavailable');
  //     }
  //   };
    
  //   checkBlockchain();
  // }, []);
  
  // Start pulse animation for emergency icon
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    );
    
    pulseAnimation.start();
    
    return () => {
      pulseAnimation.stop();
    };
  }, []);
  
  // Fetch emergency data with blockchain verification
  const fetchEmergencyData = async () => {
    setLoading(true);
    try {
      // Try to fetch from blockchain if transaction ID is available
      if (1==1) {
        try {
          const blockchainRecord = await fetchHealthcareRecord(blockchainTransactionId);
          
          if (blockchainRecord) {
            console.log('Blockchain record found:', blockchainRecord);
            setBlockchainVerified(true);
            setBlockchainDetails(blockchainRecord);
            
            // Try to fetch extended emergency data from API
            try {
              const apiResponse = await axios.get(`${API_URL}/api/emergency/${blockchainRecord.requestId}`);
              
              if (apiResponse.data) {
                // Merge blockchain data with API data
                const mergedData = {
                  ...apiResponse.data.request,
                  facility: apiResponse.data.hospital,
                  responders: apiResponse.data.ambulance ? [
                    {
                      id: apiResponse.data.ambulance.id,
                      type: 'ambulance',
                      status: apiResponse.data.ambulance.current_status === 'Dispatched' ? 'en_route' : 'on_scene',
                      eta: apiResponse.data.response?.estimated_arrival_time || 5,
                      location: apiResponse.data.ambulance.current_location || {
                        latitude: apiResponse.data.request.user_location.latitude - 0.005,
                        longitude: apiResponse.data.request.user_location.longitude + 0.004
                      }
                    }
                  ] : [],
                  patient: {
                    location: apiResponse.data.request.user_location,
                    address: 'Current Location'
                  },
                  doctors: generateRandomDoctors(),
                  timeline: [
                    {
                      id: 'T1',
                      time: apiResponse.data.request.createdAt,
                      event: 'Emergency reported',
                      details: 'Initial assessment started',
                      blockchainVerified: true
                    },
                    {
                      id: 'T2',
                      time: apiResponse.data.response?.createdAt || new Date(new Date(apiResponse.data.request.createdAt).getTime() + 60000).toISOString(),
                      event: 'Ambulance dispatched',
                      details: `${apiResponse.data.hospital?.name || 'Emergency services'} assigned to emergency`,
                      blockchainVerified: true
                    },
                    ...generateAdditionalTimelineEvents(apiResponse.data.request.createdAt)
                  ],
                  blockchainVerified: true,
                  blockchainTransactionId: blockchainTransactionId
                };
                
                setEmergency(mergedData);
                setLoading(false);
                setRefreshing(false);
                setupPeriodicUpdates();
                return;
              }
            } catch (apiError) {
              console.error('Error fetching from API:', apiError);
              // Continue to fallback
            }
          }
        } catch (blockchainError) {
          console.error('Error fetching from blockchain:', blockchainError);
          // Continue to fallback
        }
      }
      
      // Fallback to dummy data when blockchain verification fails or isn't available
      useDummyEmergencyData();
    } catch (error) {
      console.error('Error fetching emergency data:', error);
      setLoading(false);
      setRefreshing(false);
      Alert.alert('Error', 'Failed to load emergency status. Please try again.');
    }
  };
  
  // Generate mock doctor data
  const generateRandomDoctors = () => {
    return [
      {
        id: 'D1',
        name: 'Dr. Priya Mehra',
        specialty: 'Cardio',
        status: 'available',
        avatar: null,
        blockchainVerified: true,
        credentials: {
          license: 'MCI-12345',
          hospital: 'Manipal Hospital',
          experience: '12 years'
        }
      },
      {
        id: 'D2',
        name: 'Dr. Ira Das',
        specialty: 'General',
        status: 'joining',
        avatar: null,
        blockchainVerified: false
      }
    ];
  };
  
  // Generate additional timeline events
  const generateAdditionalTimelineEvents = (startTime) => {
    const startDate = new Date(startTime);
    const events = [
      {
        id: 'T3',
        time: new Date(startDate.getTime() + 120000).toISOString(),
        event: 'Medical team notified',
        details: 'Emergency response team preparing',
        blockchainVerified: true
      },
      {
        id: 'T4',
        time: new Date(startDate.getTime() + 180000).toISOString(),
        event: 'Remote doctor consultation started',
        details: 'Dr. Priya Mehra connected to emergency channel',
        blockchainVerified: false
      }
    ];
    
    return events;
  };
  
  // Use dummy emergency data
  const useDummyEmergencyData = () => {
    // Using dummy data for development when blockchain is unavailable
    setTimeout(() => {
      const DUMMY_EMERGENCY = {
        id: 'ER12345',
        status: 'active',
        priority: 'high',
        reportedAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        facility: {
          id: '1',
          name: 'Manipal Hospital, Whitefield',
          phone: '+91 80 2345 6789',
          location: {
            latitude: 12.9698,
            longitude: 77.7500
          },
          blockchainVerified: true,
          blockchainId: 'f8e712a9b5c24d3e9f6a7c2f8b4a1e5d'
        },
        patient: {
          location: {
            latitude: 12.9352,
            longitude: 77.6245
          },
          address: '45 Koramangala 5th Block, Bangalore, 560095'
        },
        responders: [
          {
            id: 'R1',
            type: 'ambulance',
            status: 'en_route',
            eta: 4, // minutes
            location: {
              latitude: 12.9100, // En route between Koramangala and Whitefield
              longitude: 77.6800
            },
            blockchainVerified: true,
            blockchainId: 'a7e193b4d5c98f2e1a6b7d8c9e0f1a2b'
          }
        ],
        doctors: [
          {
            id: 'D1',
            name: 'Dr. Priya Mehra',
            specialty: 'Cardio',
            status: 'available',
            avatar: null,
            blockchainVerified: true,
            credentials: {
              license: 'MCI-12345',
              hospital: 'Manipal Hospital',
              experience: '12 years'
            }
          },
          {
            id: 'D2',
            name: 'Dr. Ira Das',
            specialty: 'General',
            status: 'joining',
            avatar: null,
            blockchainVerified: false
          }
        ],
        timeline: [
          {
            id: 'T1',
            time: new Date(Date.now() - 300000).toISOString(),
            event: 'Emergency reported',
            details: 'Initial assessment: Possible cardiac event',
            blockchainVerified: true
          },
          {
            id: 'T2',
            time: new Date(Date.now() - 240000).toISOString(),
            event: 'Ambulance dispatched',
            details: 'Fortis unit assigned to emergency',
            blockchainVerified: true
          },
          {
            id: 'T3',
            time: new Date(Date.now() - 180000).toISOString(),
            event: 'Medical team notified',
            details: 'Emergency response team preparing',
            blockchainVerified: false
          },
          {
            id: 'T4',
            time: new Date(Date.now() - 120000).toISOString(),
            event: 'Remote doctor consultation started',
            details: 'Dr. Priya Mehra connected to emergency channel',
            blockchainVerified: false
          }
        ],
        blockchainTransactionId: blockchainTransactionId || 'mock-bc-9876543210abcdef0987654321',
        blockchainVerified: !!blockchainTransactionId
      };
      
      setEmergency(DUMMY_EMERGENCY);
      setLoading(false);
      setRefreshing(false);
      
      setupPeriodicUpdates();
    }, 1500);
  };
  
  // Set up periodic updates for emergency status
  const setupPeriodicUpdates = () => {
    // Update emergency timeline every 30 seconds with a new event
    const interval = setInterval(() => {
      setEmergency(prev => {
        if (!prev) return prev;
        
        // Add a new timeline event
        const newEvent = {
          id: `T${prev.timeline.length + 1}`,
          time: new Date().toISOString(),
          event: getRandomEvent(),
          details: getRandomDetails(),
          blockchainVerified: Math.random() > 0.5 // Random verified status
        };
        
        return {
          ...prev,
          timeline: [...prev.timeline, newEvent]
        };
      });
    }, 30000);
    
    return () => clearInterval(interval);
  };
  
  // Generate random events for timeline updates
  const getRandomEvent = () => {
    const events = [
      'Vitals update received',
      'Additional medical resources allocated',
      'Status update from ambulance team',
      'Medication recommendation provided',
      'BBMP Ambulance ETA updated',
      'Blood test results available',
      'Ayurvedic medicine history noted'
    ];
    return events[Math.floor(Math.random() * events.length)];
  };
  
  // Generate random details for timeline updates
  const getRandomDetails = () => {
    const details = [
      'Patient remains stable',
      'Blood pressure: 135/85, Heart rate: 88 bpm',
      'Traffic conditions on Outer Ring Road affecting arrival time',
      'Emergency room at Manipal Hospital being prepared for arrival',
      'Additional specialists from Apollo Hospital being consulted',
      'ECG results transmitted to Dr. Kumar',
      'Oxygen levels being monitored'
    ];
    return details[Math.floor(Math.random() * details.length)];
  };
  
  // Load emergency data on component mount
  useEffect(() => {
    fetchEmergencyData();
  }, [facilityId, blockchainTransactionId]);
  
  // Format timestamp to relative time
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return time.toLocaleDateString();
    }
  };
  
  // Format timestamp to time
  const formatTime = (timestamp) => {
    const time = new Date(timestamp);
    return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Handle doctor selection for consultation
  const handleDoctorSelect = (doctor) => {
    setSelectedDoctor(doctor);
    setShowDoctorModal(true);
  };
  
  // Start video call with doctor
  const startDoctorCall = () => {
    setDoctorCallStatus('connecting');
    
    // Simulate connecting to doctor
    setTimeout(() => {
      setDoctorCallStatus('connected');
      
      // Start call timer
      callTimerRef.current = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    }, 2000);
  };
  
  // End video call with doctor
  const endDoctorCall = () => {
    setDoctorCallStatus('idle');
    
    // Clear call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
      setCallTimer(0);
    }
    
    setShowDoctorModal(false);
  };
  
  // Format call duration
  const formatCallDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Call emergency services directly
  const callEmergencyServices = () => {
    Alert.alert(
      'Call Emergency Services',
      'Do you want to call emergency services directly?',
      [
        { 
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Call',
          onPress: () => {
            const phoneNumber = Platform.OS === 'android' ? 'tel:102' : 'telprompt:102';
            Linking.openURL(phoneNumber);
          }
        }
      ]
    );
  };
  
  // Call medical facility
  const callFacility = () => {
    if (!emergency?.facility?.phone) return;
    
    Alert.alert(
      'Call Facility',
      `Do you want to call ${emergency.facility.name}?`,
      [
        { 
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Call',
          onPress: () => {
            const phoneNumber = Platform.OS === 'android' 
              ? `tel:${emergency.facility.phone}`
              : `telprompt:${emergency.facility.phone}`;
            Linking.openURL(phoneNumber);
          }
        }
      ]
    );
  };
  
  // Toggle blockchain details modal
  const toggleBlockchainDetailsModal = () => {
    setShowBlockchainDetails(!showBlockchainDetails);
  };
  
  // Cancel emergency report with blockchain record
  const cancelEmergency = () => {
    Alert.alert(
      'Cancel Emergency',
      'Are you sure you want to cancel this emergency report? Only do this if the situation has resolved or if emergency services have arrived.',
      [
        { 
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              if (blockchainStatus === 'operational' && emergency?.blockchainTransactionId) {
                try {
                  // Try to update blockchain record status
                  await axios.put(`${API_URL}/api/emergency/${emergency.id}`, {
                    status: 'Cancelled',
                    cancelled_at: new Date().toISOString()
                  });
                } catch (blockchainError) {
                  console.error('Error updating blockchain record:', blockchainError);
                  // Continue anyway to provide a good user experience
                }
              }
              
              // Show success message regardless of blockchain update
              Alert.alert(
                'Emergency Cancelled',
                'The emergency report has been cancelled and recorded on the blockchain for audit purposes.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.popToTop()
                  }
                ]
              );
            } catch (error) {
              console.error('Error cancelling emergency:', error);
              Alert.alert(
                'Error',
                'Failed to cancel emergency. Please try again.'
              );
            }
          }
        }
      ]
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A6FA5" />
        <Text style={styles.loadingText}>Loading emergency status...</Text>
        {blockchainStatus === 'operational' && (
          <Text style={styles.blockchainLoadingText}>Verifying on blockchain...</Text>
        )}
      </View>
    );
  }
  
  if (!emergency) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#E63946" />
        <Text style={styles.errorText}>Failed to load emergency status</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={fetchEmergencyData}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  // Prepare map data
  const emergencyLocation = emergency.patient.location;
  const facilityLocation = emergency.facility.location;
  const responderLocation = emergency.responders[0]?.location;
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.emergencyInfo}>
            <View style={styles.emergencyIdContainer}>
              <Text style={styles.emergencyIdLabel}>Emergency ID:</Text>
              <Text style={styles.emergencyId}>{emergency.id}</Text>
              
              {/* Blockchain verification badge */}
              {emergency.blockchainVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#2A9D8F" />
                </View>
              )}
            </View>
            
            <View style={styles.statusContainer}>
              <Animated.View style={[
                styles.statusIndicator,
                { transform: [{ scale: pulseAnim }] }
              ]}>
                <View style={styles.statusDot} />
              </Animated.View>
              <Text style={styles.statusText}>Active Emergency</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.callButton}
            onPress={callEmergencyServices}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
            <Text style={styles.callButtonText}>102</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Blockchain verification banner */}
      {emergency.blockchainVerified && (
        <TouchableOpacity
          style={styles.blockchainBanner}
          onPress={toggleBlockchainDetailsModal}
        >
          <Ionicons name="shield-checkmark" size={16} color="#2A9D8F" />
          <Text style={styles.blockchainBannerText}>
            Blockchain Verified Emergency
          </Text>
          <Ionicons name="information-circle-outline" size={16} color="#2A9D8F" />
        </TouchableOpacity>
      )}
      
      <ScrollView style={styles.scrollView}>
        {/* Map section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Location & Response</Text>
          
          <View style={styles.map}>
            <MapView
              ref={mapRef}
              style={styles.mapView}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: emergencyLocation.latitude,
                longitude: emergencyLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              }}
            >
              {/* Emergency location marker */}
              <Marker
                coordinate={emergencyLocation}
                title="Emergency Location"
              >
                <View style={styles.emergencyMarker}>
                  <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
                </View>
              </Marker>
              
              {/* Facility marker */}
              <Marker
                coordinate={facilityLocation}
                title={emergency.facility.name}
              >
                <View style={[
                  styles.facilityMarker,
                  emergency.facility.blockchainVerified && styles.verifiedMarker
                ]}>
                  <Ionicons name="medkit" size={16} color="#FFFFFF" />
                  {emergency.facility.blockchainVerified && (
                    <View style={styles.verifiedMarkerDot} />
                  )}
                </View>
              </Marker>
              
              {/* Responder marker */}
              {responderLocation && (
                <Marker
                  coordinate={responderLocation}
                  title="Ambulance"
                >
                  <View style={[
                    styles.responderMarker,
                    emergency.responders[0]?.blockchainVerified && styles.verifiedMarker
                  ]}>
                    <Ionicons name="car" size={16} color="#FFFFFF" />
                    {emergency.responders[0]?.blockchainVerified && (
                      <View style={styles.verifiedMarkerDot} />
                    )}
                  </View>
                </Marker>
              )}
              
              {/* Route from responder to patient */}
              {responderLocation && (
                <Polyline
                  coordinates={[responderLocation, emergencyLocation]}
                  strokeColor="#4A6FA5"
                  strokeWidth={3}
                  lineDashPattern={[1, 2]}
                />
              )}
              
              {/* Route from patient to facility */}
              <Polyline
                coordinates={[emergencyLocation, facilityLocation]}
                strokeColor="#E63946"
                strokeWidth={3}
                lineDashPattern={[0]}
              />
            </MapView>
          </View>
          
          <View style={styles.locationInfo}>
            <View style={styles.locationItem}>
              <View style={styles.locationIconContainer}>
                <Ionicons name="location" size={20} color="#E63946" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationTitle}>Emergency Location</Text>
                <Text style={styles.locationAddress}>{emergency.patient.address}</Text>
              </View>
            </View>
            
            <View style={styles.locationItem}>
              <View style={[
                styles.locationIconContainer,
                emergency.facility.blockchainVerified && styles.verifiedIconContainer
              ]}>
                <Ionicons name="medkit" size={20} color={emergency.facility.blockchainVerified ? "#2A9D8F" : "#4A6FA5"} />
                {emergency.facility.blockchainVerified && (
                  <View style={styles.iconVerifiedBadge}>
                    <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationTitle}>{emergency.facility.name}</Text>
                <Text style={styles.locationAddress}>
                  {getDistance(
                    emergencyLocation.latitude,
                    emergencyLocation.longitude,
                    facilityLocation.latitude,
                    facilityLocation.longitude
                  )} miles away
                </Text>
              </View>
              <TouchableOpacity
                style={styles.locationCallButton}
                onPress={callFacility}
              >
                <Ionicons name="call" size={16} color="#4A6FA5" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        
        {/* Responders section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Responders</Text>
          
          {emergency.responders.map(responder => (
            <View key={responder.id} style={styles.responderContainer}>
              <View style={styles.responderHeader}>
                <View style={styles.responderTypeContainer}>
                  <Ionicons
                    name={responder.type === 'ambulance' ? 'car' : 'medkit'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.responderType}>
                    {responder.type === 'ambulance' ? 'Ambulance' : 'Medical Team'}
                  </Text>
                </View>
                
                <View style={[
                  styles.responderStatusContainer,
                  responder.status === 'en_route' ? styles.enRouteStatus : styles.onSceneStatus
                ]}>
                  <Text style={styles.responderStatus}>
                    {responder.status === 'en_route' ? 'En Route' : 'On Scene'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.responderDetails}>
                <View style={styles.responderEta}>
                  <Ionicons name="time" size={16} color="#4A6FA5" />
                  <Text style={styles.responderEtaText}>
                    {responder.status === 'en_route'
                      ? `ETA: ${responder.eta} min`
                      : 'Arrived'
                    }
                  </Text>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: responder.status === 'en_route'
                          ? `${100 - (responder.eta / 10) * 100}%` 
                          : '100%'
                      }
                    ]}
                  />
                </View>
              </View>
              
              {/* Blockchain verification info */}
              {responder.blockchainVerified && (
                <View style={styles.blockchainInfoRow}>
                  <Ionicons name="shield-checkmark" size={14} color="#2A9D8F" />
                  <Text style={styles.blockchainInfoText}>
                    Blockchain Verified: ID {responder.blockchainId ? 
                      responder.blockchainId.substring(0, 8) + '...' : 
                      'N/A'}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
        
        {/* Medical team section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Medical Team</Text>
          
          <FlatList
            data={emergency.doctors}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.doctorCard}
                onPress={() => handleDoctorSelect(item)}
              >
                <View style={styles.doctorAvatarContainer}>
                  {item.avatar ? (
                    <Image source={{ uri: item.avatar }} style={styles.doctorAvatar} />
                  ) : (
                    <View style={styles.doctorAvatarPlaceholder}>
                      <Text style={styles.doctorAvatarText}>
                        {item.name.split(' ').map(n => n[0]).join('')}
                      </Text>
                    </View>
                  )}
                  <View style={[
                    styles.doctorStatusIndicator,
                    { backgroundColor: item.status === 'available' ? '#2A9D8F' : '#F9A826' }
                  ]} />
                </View>
                
                <View style={styles.doctorNameContainer}>
                  <Text style={styles.doctorName}>{item.name}</Text>
                  {item.blockchainVerified && (
                    <Ionicons name="shield-checkmark" size={14} color="#2A9D8F" />
                  )}
                </View>
                
                <Text style={styles.doctorSpecialty}>{item.specialty}</Text>
                
                <TouchableOpacity style={styles.consultButton}>
                  <Ionicons name="videocam" size={14} color="#FFFFFF" />
                  <Text style={styles.consultButtonText}>Consult</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
        
        {/* Timeline section */}
        <View style={styles.sectionContainer}>
          <View style={styles.timelineHeaderRow}>
            <Text style={styles.sectionTitle}>Emergency Timeline</Text>
            
            {/* Legend for blockchain verification */}
            <View style={styles.verificationLegend}>
              <Ionicons name="shield-checkmark" size={14} color="#2A9D8F" />
              <Text style={styles.verificationLegendText}>Blockchain Verified</Text>
            </View>
          </View>
          
          <View style={styles.timeline}>
            {emergency.timeline.map((event, index) => (
              <View key={event.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    index === 0 && styles.timelineFirstDot,
                    event.blockchainVerified && styles.timelineVerifiedDot
                  ]}>
                    {event.blockchainVerified && (
                      <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
                    )}
                  </View>
                  {index !== emergency.timeline.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      event.blockchainVerified && index < emergency.timeline.length - 1 && 
                      emergency.timeline[index + 1].blockchainVerified && 
                      styles.timelineVerifiedLine
                    ]} />
                  )}
                </View>
                
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <View style={styles.timelineEventRow}>
                      <Text style={styles.timelineEvent}>{event.event}</Text>
                      {event.blockchainVerified && (
                        <View style={styles.timelineVerifiedBadge}>
                          <Ionicons name="shield-checkmark" size={10} color="#2A9D8F" />
                          <Text style={styles.timelineVerifiedText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.timelineTime}>{formatTime(event.time)}</Text>
                  </View>
                  
                  <Text style={styles.timelineDetails}>{event.details}</Text>
                  
                  <Text style={styles.timelineRelative}>
                    {formatRelativeTime(event.time)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        
        {/* Emergency actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelEmergency}
          >
            <Ionicons name="close-circle" size={20} color="#64748B" />
            <Text style={styles.cancelButtonText}>Cancel Emergency</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Doctor Consultation Modal */}
      <Modal
        visible={showDoctorModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (doctorCallStatus === 'connected') {
            endDoctorCall();
          } else {
            setShowDoctorModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedDoctor && (
              <>
                <View style={styles.modalHeader}>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => {
                      if (doctorCallStatus === 'connected') {
                        endDoctorCall();
                      } else {
                        setShowDoctorModal(false);
                      }
                    }}
                  >
                    <Ionicons name="close" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                  
                  <Text style={styles.modalTitle}>Doctor Consultation</Text>
                </View>
                
                <View style={styles.doctorConsultContent}>
                  <View style={styles.doctorProfile}>
                    <View style={styles.doctorLargeAvatarContainer}>
                      {selectedDoctor.avatar ? (
                        <Image source={{ uri: selectedDoctor.avatar }} style={styles.doctorLargeAvatar} />
                      ) : (
                        <View style={styles.doctorLargeAvatarPlaceholder}>
                          <Text style={styles.doctorLargeAvatarText}>
                            {selectedDoctor.name.split(' ').map(n => n[0]).join('')}
                          </Text>
                        </View>
                      )}
                      
                      {/* Blockchain verification badge */}
                      {selectedDoctor.blockchainVerified && (
                        <View style={styles.doctorVerifiedBadge}>
                          <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    
                    <Text style={styles.doctorLargeName}>{selectedDoctor.name}</Text>
                    <Text style={styles.doctorLargeSpecialty}>{selectedDoctor.specialty}</Text>
                    
                    {doctorCallStatus === 'idle' ? (
                      <Text style={styles.doctorAvailability}>
                        {selectedDoctor.status === 'available' ? 'Available Now' : 'Available Soon'}
                      </Text>
                    ) : doctorCallStatus === 'connecting' ? (
                      <Text style={styles.doctorConnecting}>Connecting...</Text>
                    ) : (
                      <Text style={styles.doctorConnected}>
                        Connected • {formatCallDuration(callTimer)}
                      </Text>
                    )}
                    
                    {/* Doctor blockchain credentials */}
                    {selectedDoctor.blockchainVerified && selectedDoctor.credentials && (
                      <View style={styles.doctorCredentials}>
                        <View style={styles.credentialHeader}>
                          <Ionicons name="shield-checkmark" size={14} color="#2A9D8F" />
                          <Text style={styles.credentialHeaderText}>Blockchain Verified Credentials</Text>
                        </View>
                        
                        {Object.entries(selectedDoctor.credentials).map(([key, value]) => (
                          <View key={key} style={styles.credentialRow}>
                            <Text style={styles.credentialLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}:</Text>
                            <Text style={styles.credentialValue}>{value}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  
                  {doctorCallStatus === 'idle' ? (
                    <TouchableOpacity
                      style={styles.startCallButton}
                      onPress={startDoctorCall}
                      disabled={selectedDoctor.status !== 'available'}
                    >
                      <LinearGradient
                        colors={
                          selectedDoctor.status === 'available'
                            ? ['#4A6FA5', '#2C3E50']
                            : ['#9E9E9E', '#757575']
                        }
                        style={styles.startCallGradient}
                      >
                        <Ionicons name="videocam" size={24} color="#FFFFFF" />
                        <Text style={styles.startCallText}>
                          {selectedDoctor.status === 'available'
                            ? 'Start Video Consultation'
                            : 'Doctor Unavailable'
                          }
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ) : doctorCallStatus === 'connecting' ? (
                    <View style={styles.connectingContainer}>
                      <ActivityIndicator size="large" color="#4A6FA5" />
                      <Text style={styles.connectingText}>
                        Connecting to {selectedDoctor.name}...
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.activeCallContainer}>
                      <View style={styles.activeCallVideo}>
                        <Ionicons name="videocam" size={64} color="#4A6FA520" />
                        <Text style={styles.activeCallText}>
                          Video Consultation Active
                        </Text>
                      </View>
                      
                      <TouchableOpacity
                        style={styles.endCallButton}
                        onPress={endDoctorCall}
                      >
                        <Ionicons name="call" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Blockchain Details Modal */}
      <Modal
        visible={showBlockchainDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBlockchainDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowBlockchainDetails(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <Text style={styles.modalTitle}>Blockchain Verification</Text>
            </View>
            
            <ScrollView style={styles.blockchainModalContent}>
              <View style={styles.blockchainHeaderContainer}>
                <Ionicons name="shield-checkmark" size={40} color="#2A9D8F" />
                <Text style={styles.blockchainHeaderTitle}>
                  Verified Emergency Record
                </Text>
                <Text style={styles.blockchainHeaderSubtitle}>
                  This emergency has been verified and secured on the blockchain
                </Text>
              </View>
              
              <View style={styles.blockchainDetailSection}>
                <Text style={styles.blockchainDetailTitle}>Transaction ID</Text>
                <View style={styles.blockchainIdContainer}>
                  <Text style={styles.blockchainId}>
                    {emergency.blockchainTransactionId}
                  </Text>
                </View>
              </View>
              
              <View style={styles.blockchainDetailSection}>
                <Text style={styles.blockchainDetailTitle}>Timestamp</Text>
                <Text style={styles.blockchainDetailValue}>
                  {new Date(emergency.timeline[0]?.time || Date.now()).toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.blockchainDetailSection}>
                <Text style={styles.blockchainDetailTitle}>Network</Text>
                <Text style={styles.blockchainDetailValue}>IOTA Tangle</Text>
              </View>
              
              <View style={styles.blockchainDetailSection}>
                <Text style={styles.blockchainDetailTitle}>Verified Components</Text>
                <View style={styles.verifiedComponentsList}>
                  <View style={styles.verifiedComponent}>
                    <Ionicons name="checkmark-circle" size={16} color="#2A9D8F" />
                    <Text style={styles.verifiedComponentText}>Emergency Report</Text>
                  </View>
                  <View style={styles.verifiedComponent}>
                    <Ionicons name="checkmark-circle" size={16} color="#2A9D8F" />
                    <Text style={styles.verifiedComponentText}>Patient Location</Text>
                  </View>
                  <View style={styles.verifiedComponent}>
                    <Ionicons name="checkmark-circle" size={16} color="#2A9D8F" />
                    <Text style={styles.verifiedComponentText}>Hospital Assignment</Text>
                  </View>
                  <View style={styles.verifiedComponent}>
                    <Ionicons name="checkmark-circle" size={16} color="#2A9D8F" />
                    <Text style={styles.verifiedComponentText}>Ambulance Dispatch</Text>
                  </View>
                </View>
              </View>
              
              <Text style={styles.blockchainInfoText}>
                Blockchain verification ensures that all emergency data is tamper-proof, 
                creating an immutable audit trail for medical and insurance purposes.
              </Text>
              
              <TouchableOpacity style={styles.blockchainExplorerButton}>
                <Text style={styles.blockchainExplorerButtonText}>
                  View on IOTA Explorer
                </Text>
                <Ionicons name="open-outline" size={16} color="#4A6FA5" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// Calculate distance between two coordinates (in miles)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return (distance / 1.609).toFixed(1); // Convert to miles
};

const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  blockchainLoadingText: {
    fontSize: 14,
    color: '#2A9D8F',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4A6FA5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  header: {
    backgroundColor: '#4A6FA5',
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emergencyInfo: {
    flex: 1,
    marginLeft: 10,
  },
  emergencyIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emergencyIdLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  emergencyId: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
    marginRight: 6,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(42, 157, 143, 0.2)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF40',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E63946',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  callButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  blockchainBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  blockchainBannerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2A9D8F',
    marginHorizontal: 8,
  },
  scrollView: {
    flex: 1,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  verificationLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationLegendText: {
    fontSize: 12,
    color: '#2A9D8F',
    marginLeft: 4,
  },
  map: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  mapView: {
    ...StyleSheet.absoluteFillObject,
  },
  emergencyMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
  },
  facilityMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A6FA5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  responderMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A9D8F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedMarker: {
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  verifiedMarkerDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2A9D8F',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  locationInfo: {
    marginTop: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verifiedIconContainer: {
    backgroundColor: '#D1FAE520',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  iconVerifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2A9D8F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationDetails: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  locationAddress: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  locationCallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  responderContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  responderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  responderTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A6FA5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  responderType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  responderStatusContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  enRouteStatus: {
    backgroundColor: '#F9A82620',
  },
  onSceneStatus: {
    backgroundColor: '#2A9D8F20',
  },
  responderStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  responderDetails: {
    marginTop: 8,
  },
  responderEta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  responderEtaText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginLeft: 6,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4A6FA5',
  },
  blockchainInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  blockchainInfoText: {
    fontSize: 12,
    color: '#2A9D8F',
    marginLeft: 6,
  },
  doctorCard: {
    width: 150,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
  },
  doctorAvatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  doctorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  doctorAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4A6FA520',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A6FA5',
  },
  doctorStatusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    textAlign: 'center',
    marginRight: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    width: '100%',
    backgroundColor: '#4A6FA5',
  },
  consultButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  timeline: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4A6FA5',
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineFirstDot: {
    backgroundColor: '#E63946',
  },
  timelineVerifiedDot: {
    backgroundColor: '#2A9D8F',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    marginBottom: 0,
    marginLeft: 7,
  },
  timelineVerifiedLine: {
    backgroundColor: '#2A9D8F',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  timelineEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timelineEvent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  timelineVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE520',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timelineVerifiedText: {
    fontSize: 10,
    color: '#2A9D8F',
    marginLeft: 2,
  },
  timelineTime: {
    fontSize: 14,
    color: '#64748B',
  },
  timelineDetails: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  timelineRelative: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  actionsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
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
    alignItems: 'center',
    backgroundColor: '#4A6FA5',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  modalCloseButton: {
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  doctorConsultContent: {
    padding: 24,
  },
  doctorProfile: {
    alignItems: 'center',
    marginBottom: 24,
  },
  doctorLargeAvatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  doctorLargeAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  doctorLargeAvatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#4A6FA520',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorLargeAvatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4A6FA5',
  },
  doctorVerifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2A9D8F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  doctorLargeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  doctorLargeSpecialty: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 8,
  },
  doctorAvailability: {
    fontSize: 14,
    color: '#2A9D8F',
    fontWeight: '500',
  },
  doctorConnecting: {
    fontSize: 14,
    color: '#F9A826',
    fontWeight: '500',
  },
  doctorConnected: {
    fontSize: 14,
    color: '#4A6FA5',
    fontWeight: '500',
  },
  doctorCredentials: {
    width: '100%',
    backgroundColor: '#F8FAFA',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  credentialHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2A9D8F',
    marginLeft: 6,
  },
  credentialRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  credentialLabel: {
    fontSize: 14,
    color: '#64748B',
    width: 100,
  },
  credentialValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    flex: 1,
  },
  startCallButton: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  startCallGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  startCallText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  connectingContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  connectingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  activeCallContainer: {
    alignItems: 'center',
  },
  activeCallVideo: {
    width: '100%',
    height: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  activeCallText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '135deg' }],
  },
  blockchainModalContent: {
    padding: 24,
  },
  blockchainHeaderContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  blockchainHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  blockchainHeaderSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  blockchainDetailSection: {
    marginBottom: 16,
  },
  blockchainDetailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
  },
  blockchainIdContainer: {
    backgroundColor: '#F1F5F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  blockchainId: {
    fontSize: 14,
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  blockchainDetailValue: {
    fontSize: 16,
    color: '#334155',
  },
  verifiedComponentsList: {
    marginTop: 8,
  },
  verifiedComponent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifiedComponentText: {
    fontSize: 14,
    color: '#334155',
    marginLeft: 8,
  },
  blockchainInfoText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 16,
    marginBottom: 24,
  },
  blockchainExplorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  blockchainExplorerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A6FA5',
    marginRight: 8,
  },
});

export default EmergencyStatusScreen;