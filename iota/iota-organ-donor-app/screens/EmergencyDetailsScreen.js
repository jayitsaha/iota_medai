import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Platform
} from 'react-native';
import {
  Surface,
  Title,
  Paragraph,
  Button,
  Card,
  Divider,
  ActivityIndicator,
  Chip
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
// import MapView, { Marker, Polyline } from 'react-native-maps';
import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG.API_URL || 'http://localhost:3000/api';

const EmergencyDetailsScreen = ({ route, navigation }) => {
  const { emergency } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [emergencyDetails, setEmergencyDetails] = useState(emergency || null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [hospital, setHospital] = useState(null);
  const [ambulance, setAmbulance] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const mapRef = useRef(null);
  const timerRef = useRef(null);
  
  // Initialize and cleanup timer
  useEffect(() => {
    if (emergencyDetails) {
      // Start timer to track elapsed time
      const startTime = new Date(emergencyDetails.timestamp).getTime();
      timerRef.current = setInterval(() => {
        const now = new Date().getTime();
        const elapsed = Math.floor((now - startTime) / 1000); // seconds
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [emergencyDetails]);
  
  // Get current location and start tracking
  useEffect(() => {
    let locationSubscription;
    
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for emergency tracking');
          return;
        }
        
        // Get initial location
        let location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location.coords);
        
        // Start location tracking
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (newLocation) => {
            setCurrentLocation(newLocation.coords);
          }
        );
      } catch (error) {
        console.error('Error getting location:', error);
      }
    })();
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);
  
  // Fetch emergency details, hospital, and ambulance
  useEffect(() => {
    if (emergencyDetails) {
      fetchHospitalDetails(emergencyDetails.hospital_id);
    } else if (route.params?.requestId) {
      fetchEmergencyDetails(route.params.requestId);
    }
  }, [emergencyDetails, route.params]);
  
  // Fetch emergency details
  const fetchEmergencyDetails = async (requestId) => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/emergency/${requestId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch emergency details');
      }
      
      const data = await response.json();
      setEmergencyDetails(data);
      
      // Fetch hospital details if hospital_id is available
      if (data.hospital_id) {
        fetchHospitalDetails(data.hospital_id);
      }
    } catch (error) {
      console.error('Error fetching emergency details:', error);
      Alert.alert('Error', 'Failed to fetch emergency details');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch hospital details
  const fetchHospitalDetails = async (hospitalId) => {
    try {
      const response = await fetch(`${API_URL}/hospitals/${hospitalId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch hospital details');
      }
      
      const data = await response.json();
      setHospital(data);
      
      // Fetch ambulance details if ambulance_id is available
      if (emergencyDetails?.ambulance_id) {
        fetchAmbulanceDetails(emergencyDetails.ambulance_id);
      }
    } catch (error) {
      console.error('Error fetching hospital details:', error);
    }
  };
  
  // Fetch ambulance details
  const fetchAmbulanceDetails = async (ambulanceId) => {
    try {
      // This endpoint might not exist yet, but we'll include the code
      const response = await fetch(`${API_URL}/ambulances/${ambulanceId}`);
      
      if (!response.ok) {
        // If endpoint doesn't exist, we'll just use the ambulance ID
        setAmbulance({ id: ambulanceId });
        return;
      }
      
      const data = await response.json();
      setAmbulance(data);
    } catch (error) {
      console.error('Error fetching ambulance details:', error);
      // If fetch fails, just use the ambulance ID
      setAmbulance({ id: ambulanceId });
    }
  };
  
  // Refresh emergency details
  const refreshEmergencyDetails = async () => {
    setRefreshing(true);
    
    try {
      if (emergencyDetails?.request_id) {
        await fetchEmergencyDetails(emergencyDetails.request_id);
      } else if (route.params?.requestId) {
        await fetchEmergencyDetails(route.params.requestId);
      }
    } catch (error) {
      console.error('Error refreshing emergency details:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Open phone dialer
  const callEmergency = (phoneNumber) => {
    const number = phoneNumber || (hospital?.contact?.emergency_phone) || '911';
    
    Linking.openURL(`tel:${number}`)
      .catch(error => {
        console.error('Error opening phone dialer:', error);
        Alert.alert('Error', 'Could not open phone dialer');
      });
  };
  
  // Open maps app with directions
  const openDirections = () => {
    if (!hospital?.location || !currentLocation) return;
    
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    
    const latLng = `${hospital.location.latitude},${hospital.location.longitude}`;
    const label = hospital.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });
    
    Linking.openURL(url)
      .catch(error => {
        console.error('Error opening maps:', error);
        Alert.alert('Error', 'Could not open maps application');
      });
  };
  
  // Format time display (MM:SS)
  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Calculate remaining arrival time
  const getRemainingTime = () => {
    if (!emergencyDetails?.estimated_arrival_time) return null;
    
    const estimatedSeconds = emergencyDetails.estimated_arrival_time * 60; // convert minutes to seconds
    const remaining = estimatedSeconds - elapsedTime;
    
    return remaining > 0 ? remaining : 0;
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Requested':
        return '#ff9800';
      case 'Assigned':
        return '#2196f3';
      case 'En Route':
        return '#4caf50';
      case 'Arrived':
        return '#9c27b0';
      case 'Completed':
        return '#4caf50';
      case 'Cancelled':
        return '#f44336';
      default:
        return '#757575';
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading emergency details...</Text>
      </View>
    );
  }
  
  if (!emergencyDetails) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color="#e74c3c" />
        <Text style={styles.errorText}>Emergency details not found</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={styles.errorButton}
        >
          Go Back
        </Button>
      </View>
    );
  }
  
  const remainingTime = getRemainingTime();
  
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.headerSurface}>
        <View style={styles.header}>
          <View style={styles.headerStatusContainer}>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: getStatusColor(emergencyDetails.status) }]}
            >
              {emergencyDetails.status || 'Requested'}
            </Chip>
          </View>
          <Title style={styles.headerTitle}>Emergency Response</Title>
          <View style={styles.requestIdContainer}>
            <Text style={styles.requestIdLabel}>Request ID:</Text>
            <Text style={styles.requestId}>{emergencyDetails.request_id}</Text>
          </View>
        </View>
      </Surface>
      
      {currentLocation && hospital?.location && (
        <View style={styles.mapContainer}>
          {/* <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="Your Location"
              description="Current position"
              pinColor="blue"
            />
            
            <Marker
              coordinate={{
                latitude: hospital.location.latitude,
                longitude: hospital.location.longitude,
              }}
              title={hospital.name}
              description="Assigned hospital"
              pinColor="red"
            >
              <MaterialIcons name="local-hospital" size={30} color="red" />
            </Marker>
            
            <Polyline
              coordinates={[
                { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
                { latitude: hospital.location.latitude, longitude: hospital.location.longitude },
              ]}
              strokeColor="rgba(0, 0, 255, 0.5)"
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          </MapView> */}
        </View>
      )}
      
      <View style={styles.contentContainer}>
        <Card style={styles.timingCard}>
          <Card.Content>
            <Title style={styles.timingTitle}>Estimated Arrival</Title>
            <View style={styles.timingRow}>
              <View style={styles.timingItem}>
                <Text style={styles.timingLabel}>Distance</Text>
                <Text style={styles.timingValue}>{emergencyDetails.distance ? `${emergencyDetails.distance.toFixed(1)} km` : 'Unknown'}</Text>
              </View>
              
              <View style={styles.timingItem}>
                <Text style={styles.timingLabel}>ETA</Text>
                <Text style={styles.timingValue}>{emergencyDetails.estimated_arrival_time ? `${emergencyDetails.estimated_arrival_time} min` : 'Unknown'}</Text>
              </View>
              
              <View style={styles.timingItem}>
                <Text style={styles.timingLabel}>Remaining</Text>
                <Text style={[styles.timingValue, remainingTime === 0 && styles.arrived]}>
                  {remainingTime !== null ? (remainingTime > 0 ? `${formatTime(remainingTime)}` : 'Arrived') : 'Unknown'}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
        
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Hospital</Title>
          
          {hospital ? (
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>{hospital.name}</Text>
              <Text style={styles.hospitalAddress}>
                {hospital.location?.address}, {hospital.location?.city}, {hospital.location?.state}
              </Text>
              
              <View style={styles.contactContainer}>
                <Button
                  mode="contained"
                  icon="phone"
                  onPress={() => callEmergency(hospital.contact?.emergency_phone)}
                  style={styles.contactButton}
                >
                  Call Hospital
                </Button>
                
                <Button
                  mode="outlined"
                  icon="map-marker-radius"
                  onPress={openDirections}
                  style={styles.contactButton}
                >
                  Directions
                </Button>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>Hospital information not available</Text>
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Ambulance</Title>
          
          {ambulance ? (
            <View style={styles.ambulanceInfo}>
              <Text style={styles.ambulanceId}>ID: {ambulance.id}</Text>
              {ambulance.registration_number && (
                <Text style={styles.ambulanceDetail}>
                  Registration: {ambulance.registration_number}
                </Text>
              )}
              {ambulance.vehicle_type && (
                <Text style={styles.ambulanceDetail}>
                  Type: {ambulance.vehicle_type}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noDataText}>Ambulance details not available</Text>
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.section}>
          <Title style={styles.sectionTitle}>Blockchain Information</Title>
          
          {emergencyDetails.blockchain_tx_id ? (
            <View style={styles.blockchainInfo}>
              <Text style={styles.blockchainLabel}>Transaction ID:</Text>
              <Text style={styles.blockchainValue}>{emergencyDetails.blockchain_tx_id}</Text>
              
              <Text style={styles.blockchainLabel}>Timestamp:</Text>
              <Text style={styles.blockchainValue}>
                {new Date(emergencyDetails.timestamp).toLocaleString()}
              </Text>
              
              <View style={styles.verifiedContainer}>
                <MaterialIcons name="verified" size={20} color="#4caf50" />
                <Text style={styles.verifiedText}>Verified on IOTA Blockchain</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noDataText}>Blockchain information not available</Text>
          )}
        </View>
        
        <Button
          mode="outlined"
          icon="refresh"
          onPress={refreshEmergencyDetails}
          style={styles.refreshButton}
          loading={refreshing}
          disabled={refreshing}
        >
          Refresh Status
        </Button>
        
        <Button
          mode="contained"
          icon="phone"
          onPress={() => callEmergency('911')}
          style={styles.emergencyButton}
        >
          Call Emergency Services (911)
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 16,
  },
  headerSurface: {
    elevation: 4,
    borderRadius: 0,
    backgroundColor: '#6200ee',
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  headerStatusContainer: {
    marginBottom: 8,
  },
  statusChip: {
    height: 30,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    marginVertical: 8,
  },
  requestIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIdLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 4,
  },
  requestId: {
    color: '#fff',
    fontWeight: 'bold',
  },
  mapContainer: {
    height: 200,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  map: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  timingCard: {
    marginBottom: 16,
    elevation: 4,
  },
  timingTitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timingItem: {
    alignItems: 'center',
    flex: 1,
  },
  timingLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  timingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  arrived: {
    color: '#4caf50',
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 12,
  },
  hospitalInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  contactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  ambulanceInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  ambulanceId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ambulanceDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  divider: {
    marginVertical: 8,
  },
  blockchainInfo: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  blockchainLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  blockchainValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  verifiedText: {
    marginLeft: 8,
    color: '#4caf50',
    fontWeight: 'bold',
  },
  noDataText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  refreshButton: {
    marginTop: 16,
    marginBottom: 12,
  },
  emergencyButton: {
    marginBottom: 24,
    backgroundColor: '#e74c3c',
  },
});

export default EmergencyDetailsScreen;