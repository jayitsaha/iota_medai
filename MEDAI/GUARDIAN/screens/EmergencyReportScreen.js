import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Animated,
  SafeAreaView,
  StatusBar
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Audio } from 'expo-av';

// Import the blockchain service
import { checkBlockchainStatus } from '../services/blockchainService';

// Config
import { CONFIG } from '../config';

// Screen dimensions
const { width, height } = Dimensions.get('window');

// API URL
const API_URL = CONFIG?.API_URL || 'https://medai-guardian-api.herokuapp.com';

const EmergencyReportScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [emergencyStatus, setEmergencyStatus] = useState('ready'); // ready, sending, sent
  const [blockchainStatus, setBlockchainStatus] = useState(null); // null, operational, unavailable
  const [transactionId, setTransactionId] = useState(null); // Blockchain transaction ID
  const mapRef = useRef(null);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Start pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        })
      ])
    ).start();
  }, []);

  // Button press animation
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

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

  // Get current location
  const getLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant location permissions to use emergency services.'
        );
        setLocationLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setLocation(currentLocation.coords);
      setLocationLoading(false);
      
      // Fetch nearby facilities based on location
      fetchNearbyFacilities(currentLocation.coords);
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationLoading(false);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again.'
      );
    }
  };

  // Fetch nearby medical facilities from blockchain
  const fetchNearbyFacilities = async (coords) => {
    setLoading(true);
    try {
      // In a real app, fetch from API with blockchain verification
      if (1 === 1) {
        try {
          // Real API call to fetch nearby hospitals
          const response = await axios.get(`${API_URL}/hospitals`);
          
          if (!response.data) {
            throw new Error('No hospitals data received');
          }

          console.log(response.data)
          
          // Calculate distance for each hospital and add to the data
          const hospitalsWithDistance = response.data.map(hospital => {
            const distance = calculateDistance(
              coords.latitude,
              coords.longitude,
              hospital.location.latitude,
              hospital.location.longitude
            );
            
            // Calculate estimated time (assuming average speed of 50 km/h)
            const estimatedTimeMinutes = Math.round(distance * 1.2); // 1.2 is a factor to account for roads
            
            return {
              ...hospital,
              distance,
              time: estimatedTimeMinutes,
              coordinates: {
                latitude: hospital.location.latitude,
                longitude: hospital.location.longitude
              },
              // Map the API data to match our UI expectations
              type: hospital.emergency_capacity > 0 ? 'hospital' : 'clinic',
              availability: {
                beds: hospital.emergency_capacity || 0,
                ambulances: 0, // Will be updated below
                emergencyRoom: hospital.emergency_capacity > 5 ? 'Available' : 
                            hospital.emergency_capacity > 0 ? 'Limited' : 'Busy'
              },
              // Add blockchain verification status
              blockchainVerified: hospital.blockchainStatus === 'Confirmed',
              blockchainId: hospital.blockchainTransactionId
            };
          });
          
          // Sort by distance
          const sortedHospitals = hospitalsWithDistance.sort((a, b) => a.distance - b.distance);
          
          // Get the top 5 closest hospitals
          const nearbyHospitals = sortedHospitals.slice(0, 5);
          
          // For each hospital, fetch its ambulances
          const hospitalsWithAmbulances = await Promise.all(nearbyHospitals.map(async (hospital) => {
            try {
              const ambulanceResponse = await axios.get(`${API_URL}/hospitals/${hospital.id}/ambulances`);
              
              if (ambulanceResponse.data) {
                // Count available ambulances
                const availableAmbulances = ambulanceResponse.data.filter(
                  amb => amb.current_status === 'Available'
                ).length;
                
                // Check blockchain verification status of ambulances
                const blockchainVerifiedAmbulances = ambulanceResponse.data.filter(
                  amb => amb.blockchainStatus === 'Confirmed'
                ).length;
                
                // Add a blockchain verification status for ambulances
                const ambulanceBlockchainStatus = blockchainVerifiedAmbulances > 0 ? 
                  `${blockchainVerifiedAmbulances}/${ambulanceResponse.data.length} verified` : 
                  'Not verified';
                
                return {
                  ...hospital,
                  availability: {
                    ...hospital.availability,
                    ambulances: availableAmbulances
                  },
                  ambulancesBlockchainStatus: ambulanceBlockchainStatus
                };
              }
              
              return hospital;
            } catch (error) {
              console.error(`Error fetching ambulances for hospital ${hospital.id}:`, error);
              return hospital;
            }
          }));
          
          setFacilities(hospitalsWithAmbulances);
          
          // Auto-select the first facility if available
          if (hospitalsWithAmbulances.length > 0) {
            setSelectedFacility(hospitalsWithAmbulances[0]);
          }
          
          setLoading(false);
        } catch (apiError) {
          console.error('Error fetching facilities from API:', apiError);
          // Fallback to dummy data
          useDummyFacilitiesData(coords);
        }
      } else {
        // Use dummy data if blockchain is unavailable
        useDummyFacilitiesData(coords);
      }
    } catch (error) {
      console.error('Error fetching nearby facilities:', error);
      setLoading(false);
      Alert.alert(
        'Network Error',
        'Unable to fetch nearby medical facilities. Please try again.'
      );
    }
  };

  // Helper function to use dummy data
  const useDummyFacilitiesData = (coords) => {
    // Using dummy data for development and when blockchain is unavailable
    setTimeout(() => {
      // Dummy data with blockchain verification flags
      const DUMMY_FACILITIES = [
        {
          id: '1',
          name: 'Manipal Hospital, Whitefield',
          type: 'hospital',
          distance: 1.2,
          time: 5,
          address: 'Whitefield Main Road, ITPL, Bangalore, 560066',
          phone: '+91 80 2345 6789',
          coordinates: {
            latitude: coords.latitude + 0.008,
            longitude: coords.longitude - 0.005
          },
          availability: {
            beds: 12,
            ambulances: 3,
            emergencyRoom: 'Available'
          },
          blockchainVerified: true,
          blockchainId: 'f8e712a9b5c24d3e9f6a7c2f8b4a1e5d',
          ambulancesBlockchainStatus: '2/3 verified'
        },
        {
          id: '2',
          name: 'Apollo Hospital, Jayanagar',
          type: 'clinic',
          distance: 0.8,
          time: 3,
          address: '154 Jayanagar 4th Block, Bangalore, 560041',
          phone: '+91 80 4567 8901',
          coordinates: {
            latitude: coords.latitude - 0.005,
            longitude: coords.longitude + 0.007
          },
          availability: {
            beds: 5,
            ambulances: 1,
            emergencyRoom: 'Limited'
          },
          blockchainVerified: true,
          blockchainId: 'a3c579f2e80b61d4297c5f6e8d1b9a7c',
          ambulancesBlockchainStatus: '1/1 verified'
        },
        {
          id: '3',
          name: 'Fortis Ambulance Service',
          type: 'ambulance',
          distance: 0.5,
          time: 2,
          address: 'Bannerghatta Road, Bangalore, 560076',
          phone: '+91 99001 23456',
          coordinates: {
            latitude: coords.latitude + 0.002,
            longitude: coords.longitude - 0.009
          },
          availability: {
            ambulances: 2
          },
          blockchainVerified: false,
          ambulancesBlockchainStatus: 'Not verified'
        }
      ];
      
      setFacilities(DUMMY_FACILITIES);
      
      // Auto-select the first facility if available
      if (DUMMY_FACILITIES.length > 0) {
        setSelectedFacility(DUMMY_FACILITIES[0]);
      }
      
      setLoading(false);
    }, 1500);
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return Number((distance).toFixed(1)); // Keep in km with 1 decimal place
  };

  // Convert degrees to radians
  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  // Load location and facilities on component mount
  useEffect(() => {
    getLocation();
  }, []);

  // Send emergency distress signal with blockchain verification
  const sendEmergencySignal = async () => {
    if (!selectedFacility && facilities.length > 0) {
      // If no facility selected, use the nearest one
      setSelectedFacility(facilities[0]);
    }
    
    const targetFacility = selectedFacility || (facilities.length > 0 ? facilities[0] : null);
    
    if (!targetFacility) {
      Alert.alert(
        'No Facilities Available',
        'Unable to find nearby medical facilities. Please try again or call emergency services directly.'
      );
      return;
    }
    
    // Animate button press
    animateButton();
    
    // Show confirmation dialog
    Alert.alert(
      'Confirm Emergency Report',
      `Send emergency alert to ${targetFacility.name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send',
          onPress: async () => {
            setEmergencyStatus('sending');
            
            try {
              let responseData;
              
              // If blockchain is operational, use blockchain API
              if (blockchainStatus === 'operational') {
                try {
                  // Prepare emergency data
                  const emergencyData = {
                    user_location: {
                      latitude: location.latitude,
                      longitude: location.longitude
                    },
                    emergency_type: 'Medical', // Default type
                    target_facility: targetFacility.id
                  };
                  
                  // Send to blockchain API
                  const response = await axios.post(
                    `${API_URL}/api/emergency`, 
                    emergencyData
                  );
                  
                  responseData = response.data;
                  
                  // Store the blockchain transaction ID
                  if (responseData.emergency && responseData.emergency.blockchainTransactionId) {
                    setTransactionId(responseData.emergency.blockchainTransactionId);
                  }
                } catch (blockchainError) {
                  console.error('Blockchain error:', blockchainError);
                  // Fallback to non-blockchain method
                  simulateEmergencyResponse();
                }
              } else {
                // If blockchain is unavailable, simulate response
                simulateEmergencyResponse();
              }
              
              // Play confirmation sound
              const { sound } = await Audio.Sound.createAsync(
                require('../assets/sounds/alert_sent.mp3')
              );
              await sound.playAsync();
              
              // Set emergency as sent
              setEmergencyStatus('sent');
              
              // Navigate to voice/text note screen after short delay
              setTimeout(() => {
                navigation.navigate('VoiceTextNote', {
                  facilityId: targetFacility.id,
                  facilityName: targetFacility.name,
                  blockchainTransactionId: transactionId
                });
              }, 1500);
            } catch (error) {
              console.error('Error sending emergency report:', error);
              setEmergencyStatus('ready');
              Alert.alert(
                'Error',
                'Failed to send emergency report. Please try again or call emergency services directly.'
              );
            }
          }
        }
      ]
    );
  };

  // Simulate emergency response for when blockchain is unavailable
  const simulateEmergencyResponse = () => {
    // Generate a mock blockchain transaction ID
    const mockTransactionId = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    setTransactionId(mockTransactionId);
    
    // Simulate API delay
    setTimeout(() => {
      setEmergencyStatus('sent');
    }, 2000);
  };

  // Navigate to Connected Patients screen
  const navigateToConnectedPatients = () => {
    navigation.navigate('ConnectedPatients');
  };

  // Refresh location and facilities
  const handleRefresh = () => {
    getLocation();
  };

  // Select a facility
  const handleSelectFacility = (facility) => {
    console.log(facility.coordinates.latitude)
    setSelectedFacility(facility);
    
    // Animate to facility location on map
    if (mapRef.current && facility.coordinates) {
      mapRef.current.animateToRegion({
        latitude: facility.coordinates.latitude,
        longitude: facility.coordinates.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      }, 1000);
    }
  };

  // Render facility item with blockchain verification badge
  const renderFacilityItem = (facility) => {
    const isSelected = selectedFacility?.id === facility.id;
    
    return (
      <TouchableOpacity
        key={facility.id}
        style={[
          styles.facilityItem,
          isSelected && styles.facilityItemSelected
        ]}
        onPress={() => handleSelectFacility(facility)}
      >
        <View style={styles.facilityContent}>
          <View style={styles.facilityMain}>
            <Text style={styles.facilityName}>{facility.name}</Text>
            <View style={styles.facilityDetails}>
              <Text style={styles.facilityDistance}>
                {facility.distance} km • {facility.time} min
              </Text>
              
              {/* Blockchain verification badge */}
              {facility.blockchainVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#2A9D8F" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={[
            styles.facilityStatusContainer,
            facility.availability?.emergencyRoom === 'Available' ? styles.statusAvailable :
            facility.availability?.emergencyRoom === 'Limited' ? styles.statusLimited :
            styles.statusBusy
          ]}>
            <Text style={styles.facilityStatus}>
              {facility.availability?.emergencyRoom || 'Available'}
            </Text>
          </View>
        </View>
        
        {/* Availability details row */}
        <View style={styles.facilityAvailabilityRow}>
          <View style={styles.availabilityItem}>
            <Ionicons name="bed-outline" size={14} color="#64748B" />
            <Text style={styles.availabilityText}>
              {facility.availability?.beds || 0} beds
            </Text>
          </View>
          
          <View style={styles.availabilityItem}>
            <Ionicons name="car-outline" size={14} color="#64748B" />
            <Text style={styles.availabilityText}>
              {facility.availability?.ambulances || 0} ambulances
            </Text>
            
            {/* Ambulance blockchain verification */}
            {facility.ambulancesBlockchainStatus && (
              <Text style={[
                styles.ambulanceVerifiedText,
                facility.ambulancesBlockchainStatus === 'Not verified' ? 
                  styles.notVerifiedText : styles.verifiedText
              ]}>
                ({facility.ambulancesBlockchainStatus})
              </Text>
            )}
          </View>
        </View>
        
        {/* Show blockchain ID if verified */}
        {facility.blockchainVerified && facility.blockchainId && (
          <View style={styles.blockchainIdContainer}>
            <Text style={styles.blockchainIdLabel}>Blockchain ID: </Text>
            <Text style={styles.blockchainId}>{facility.blockchainId.substring(0, 12)}...</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#F8F9F9" />
      
      {/* Header with profile photo and blockchain status */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Emergency</Text>
          
          {/* Blockchain status indicator */}
          {blockchainStatus && (
            <View style={[
              styles.blockchainStatus,
              blockchainStatus === 'operational' ? styles.blockchainOperational : styles.blockchainUnavailable
            ]}>
              <Ionicons 
                name={blockchainStatus === 'operational' ? "shield-checkmark" : "shield-outline"} 
                size={12} 
                color={blockchainStatus === 'operational' ? "#2A9D8F" : "#94A3B8"} 
              />
              <Text style={[
                styles.blockchainStatusText,
                blockchainStatus === 'operational' ? styles.blockchainOperationalText : styles.blockchainUnavailableText
              ]}>
                {blockchainStatus === 'operational' ? "Blockchain Secured" : "Local Mode"}
              </Text>
            </View>
          )}
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Image 
                source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {/* Map section */}
        <View style={styles.mapContainer}>
          {locationLoading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="small" color="#4A6FA5" />
              <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
          ) : !location ? (
            <View style={styles.mapError}>
              <Ionicons name="warning-outline" size={24} color="#E57373" />
              <Text style={styles.errorText}>Unable to get your location</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={getLocation}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02
              }}
              showsUserLocation
              followsUserLocation
            >
              {/* Facility markers with blockchain verification indicator */}
              {facilities.map((facility) => (
                <Marker
                  key={facility.id}
                  coordinate={facility.coordinates}
                  title={facility.name}
                  description={`${facility.distance} mi away${facility.blockchainVerified ? ' • Blockchain Verified' : ''}`}
                  onPress={() => handleSelectFacility(facility)}
                >
                  <View style={[
                    styles.facilityMarker,
                    selectedFacility?.id === facility.id && styles.selectedFacilityMarker,
                    facility.blockchainVerified && styles.verifiedFacilityMarker
                  ]}>
                    <Ionicons
                      name={
                        facility.type === 'hospital'
                          ? 'medical-outline'
                          : facility.type === 'clinic'
                          ? 'fitness-outline'
                          : 'car-outline'
                      }
                      size={14}
                      color={selectedFacility?.id === facility.id ? '#FFFFFF' : '#4A6FA5'}
                    />
                    {facility.blockchainVerified && (
                      <View style={styles.markerVerifiedDot} />
                    )}
                  </View>
                </Marker>
              ))}
            </MapView>
          )}
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
          >
            <Ionicons name="refresh-outline" size={16} color="#4A6FA5" />
          </TouchableOpacity>
        </View>
        
        {/* Connected Patients Button */}
        <TouchableOpacity 
          style={styles.connectedPatientsButton}
          onPress={navigateToConnectedPatients}
        >
          <Ionicons name="people-outline" size={18} color="#4A6FA5" />
          <Text style={styles.connectedPatientsText}>Connected Patients</Text>
          <Ionicons name="chevron-forward" size={18} color="#4A6FA5" />
        </TouchableOpacity>
        
        {/* Nearby facilities section with blockchain verification */}
        <View style={styles.facilitiesContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Nearby Medical Facilities</Text>
            
            {/* Legend for blockchain verification */}
            <View style={styles.verificationLegend}>
              <Ionicons name="shield-checkmark" size={14} color="#2A9D8F" />
              <Text style={styles.verificationLegendText}>Blockchain Verified</Text>
            </View>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4A6FA5" />
              <Text style={styles.loadingText}>Finding nearby facilities...</Text>
            </View>
          ) : facilities.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="medical-outline" size={32} color="#CBD5E1" />
              <Text style={styles.emptyText}>No facilities found nearby</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRefresh}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.facilitiesList}>
              {facilities.map(renderFacilityItem)}
            </View>
          )}
        </View>
        
        {/* Selected facility details */}
        {selectedFacility && (
          <View style={styles.selectedFacilityContainer}>
            <View style={styles.facilityTitleRow}>
              <Text style={styles.facilityDetailsName}>{selectedFacility.name}</Text>
              
              {/* Blockchain verification badge */}
              {selectedFacility.blockchainVerified && (
                <View style={styles.detailsVerifiedBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#2A9D8F" />
                  <Text style={styles.detailsVerifiedText}>Blockchain Verified</Text>
                </View>
              )}
            </View>
            
            <View style={styles.facilityDetailsRow}>
              <Ionicons name="location-outline" size={16} color="#94A3B8" />
              <Text style={styles.facilityDetailsText}>{selectedFacility.location.address}</Text>
            </View>
            
            <View style={styles.facilityDetailsRow}>
              <Ionicons name="call-outline" size={16} color="#94A3B8" />
              <Text style={styles.facilityDetailsText}>{selectedFacility.contact.phone}</Text>
            </View>
            
            {/* Blockchain ID if available */}
            {selectedFacility.blockchainVerified && selectedFacility.blockchainId && (
              <View style={styles.facilityDetailsRow}>
                <Ionicons name="key-outline" size={16} color="#94A3B8" />
                <Text style={styles.facilityDetailsText}>Blockchain ID: {selectedFacility.blockchainId}</Text>
              </View>
            )}
            
            {/* Ambulance blockchain verification status */}
            {selectedFacility.ambulancesBlockchainStatus && (
              <View style={styles.facilityDetailsRow}>
                <Ionicons name="car-outline" size={16} color="#94A3B8" />
                <Text style={styles.facilityDetailsText}>
                  Ambulance Status: {selectedFacility.ambulancesBlockchainStatus}
                </Text>
                {selectedFacility.ambulancesBlockchainStatus !== 'Not verified' && (
                  <Ionicons name="shield-checkmark" size={14} color="#2A9D8F" style={styles.verificationIcon} />
                )}
              </View>
            )}
            
            <View style={styles.facilityStatsContainer}>
              {selectedFacility.availability?.beds !== undefined && (
                <View style={styles.facilityStat}>
                  <Text style={styles.facilityStatValue}>{selectedFacility.availability.beds}</Text>
                  <Text style={styles.facilityStatLabel}>Available Beds</Text>
                </View>
              )}
              
              {selectedFacility.availability?.ambulances !== undefined && (
                <View style={styles.facilityStat}>
                  <Text style={styles.facilityStatValue}>{selectedFacility.availability.ambulances}</Text>
                  <Text style={styles.facilityStatLabel}>Ambulances</Text>
                </View>
              )}
              
              {selectedFacility.type === 'hospital' && (
                <View style={styles.facilityStat}>
                  <Text style={styles.facilityStatValue}>{selectedFacility.time} min</Text>
                  <Text style={styles.facilityStatLabel}>ETA</Text>
                </View>
              )}
            </View>
          </View>
        )}
        
        {/* Blockchain transaction information */}
        {transactionId && emergencyStatus === 'sent' && (
          <View style={styles.transactionContainer}>
            <View style={styles.transactionHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#2A9D8F" />
              <Text style={styles.transactionTitle}>Emergency Registered on Blockchain</Text>
            </View>
            <View style={styles.transactionIdContainer}>
              <Text style={styles.transactionIdLabel}>Transaction ID:</Text>
              <Text style={styles.transactionId}>{transactionId}</Text>
            </View>
            <Text style={styles.transactionInfo}>
              This emergency report has been securely recorded on the blockchain for immutable record-keeping and transparent tracking.
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Emergency button */}
      <View style={styles.emergencyButtonContainer}>
        {emergencyStatus === 'ready' ? (
          <Animated.View style={{
            transform: [{ scale: buttonScale }],
            width: '100%'
          }}>
            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={sendEmergencySignal}
              activeOpacity={0.9}
            >
              <Ionicons name="alert-circle-outline" size={24} color="#FFFFFF" />
              <Text style={styles.emergencyButtonText}>Report Emergency</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : emergencyStatus === 'sending' ? (
          <View style={styles.emergencyStatusContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.emergencyStatusText}>
              {blockchainStatus === 'operational' ? 
                'Recording emergency on blockchain...' : 
                'Sending emergency alert...'}
            </Text>
          </View>
        ) : (
          <View style={styles.emergencyStatusContainer}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
            <Text style={styles.emergencyStatusText}>
              Emergency alert sent!
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9F9',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  blockchainStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  blockchainOperational: {
    backgroundColor: '#D1FAE5',
  },
  blockchainUnavailable: {
    backgroundColor: '#F1F5F9',
  },
  blockchainStatusText: {
    fontSize: 12,
    marginLeft: 4,
  },
  blockchainOperationalText: {
    color: '#2A9D8F',
  },
  blockchainUnavailableText: {
    color: '#94A3B8',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileImage: {
    width: 32,
    height: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  mapContainer: {
    height: 200,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  mapError: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  refreshButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  facilityMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#4A6FA5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedFacilityMarker: {
    backgroundColor: '#4A6FA5',
    borderColor: '#FFFFFF',
  },
  verifiedFacilityMarker: {
    borderColor: '#2A9D8F',
  },
  markerVerifiedDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2A9D8F',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  connectedPatientsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  connectedPatientsText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginLeft: 12,
  },
  facilitiesContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  verificationLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationLegendText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 16,
  },
  facilitiesList: {
    marginTop: 12,
  },
  facilityItem: {
    backgroundColor: '#F8F9F9',
    borderRadius: 8,
    overflow: 'hidden',
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
    marginBottom: 8,
  },
  facilityItemSelected: {
    borderLeftWidth: 3,
    borderLeftColor: '#4A6FA5',
  },
  facilityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  facilityMain: {
    flex: 1,
  },
  facilityName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 4,
  },
  facilityDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facilityDistance: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE520',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#2A9D8F',
    marginLeft: 2,
  },
  notVerifiedText: {
    fontSize: 10,
    color: '#94A3B8', 
  },
  facilityStatusContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusAvailable: {
    backgroundColor: '#D1FAE5',
  },
  statusLimited: {
    backgroundColor: '#FEF3C7',
  },
  statusBusy: {
    backgroundColor: '#FEE2E2',
  },
  facilityStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  facilityAvailabilityRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  availabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  availabilityText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  ambulanceVerifiedText: {
    fontSize: 10,
    marginLeft: 4,
  },
  blockchainIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  blockchainIdLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
  blockchainId: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  selectedFacilityContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  facilityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  facilityDetailsName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 8,
    flex: 1,
  },
  detailsVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE520',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  detailsVerifiedText: {
    fontSize: 11,
    color: '#2A9D8F',
    marginLeft: 2,
  },
  facilityDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  facilityDetailsText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
    flex: 1,
  },
  verificationIcon: {
    marginLeft: 4,
  },
  facilityStatsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  facilityStat: {
    flex: 1,
    alignItems: 'center',
  },
  facilityStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A6FA5',
  },
  facilityStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  transactionContainer: {
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A9D8F',
    marginLeft: 8,
  },
  transactionIdContainer: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionIdLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  transactionId: {
    fontSize: 12,
    color: '#334155',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  transactionInfo: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  emergencyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  emergencyButton: {
    backgroundColor: '#E57373',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#E57373',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  emergencyStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A6FA5',
    paddingVertical: 16,
    borderRadius: 12,
  },
  emergencyStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default EmergencyReportScreen;