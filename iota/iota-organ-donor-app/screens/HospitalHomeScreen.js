import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Image
} from 'react-native';
import { Button, Card, Title, Paragraph, Surface, ActivityIndicator } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useWallet } from '../services/walletService';
import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG.API_URL || 'http://localhost:3000/api';

const HospitalHomeScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [safeZoneRadius, setSafeZoneRadius] = useState(500); // in meters
  const [insideSafeZone, setInsideSafeZone] = useState(true);
  const [safeZoneCenter, setSafeZoneCenter] = useState(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [emergencyResponse, setEmergencyResponse] = useState(null);
  const { balance } = useWallet();

  // Request location permissions and get current location
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        
        if (status !== 'granted') {
          setLocationError('Location permission is required for emergency services');
          setLoading(false);
          return;
        }
        
        // Get current location
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
        
        // Set safe zone center to current location if not set
        if (!safeZoneCenter) {
          setSafeZoneCenter(location.coords);
        }
        
        // Start location tracking
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
          },
          (newLocation) => {
            setLocation(newLocation.coords);
            checkSafeZone(newLocation.coords);
          }
        );
        
        // Fetch nearby hospitals
        fetchNearbyHospitals(location.coords);
      } catch (error) {
        setLocationError('Error getting location: ' + error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  
  // Check if user is inside safe zone
  const checkSafeZone = (userLocation) => {
    if (!safeZoneCenter) return;
    
    // Calculate distance from safe zone center
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      safeZoneCenter.latitude,
      safeZoneCenter.longitude
    );
    
    // Convert to meters
    const distanceInMeters = distance * 1000;
    
    // Check if inside safe zone
    const inside = distanceInMeters <= safeZoneRadius;
    setInsideSafeZone(inside);
    
    // If user went outside safe zone and not already in emergency mode, trigger alert
    if (!inside && !emergencyMode) {
      Alert.alert(
        'Safe Zone Alert',
        'You have left your safe zone. Do you need emergency assistance?',
        [
          {
            text: 'No, I\'m fine',
            style: 'cancel',
          },
          {
            text: 'Yes, Emergency',
            style: 'destructive',
            onPress: () => triggerEmergency(),
          },
        ]
      );
    }
  };
  
  // Fetch nearby hospitals
  const fetchNearbyHospitals = async (coords) => {
    try {
      const response = await fetch(`${API_URL}/hospitals`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch hospitals');
      }
      
      const hospitals = await response.json();
      
      // Calculate distance for each hospital
      const hospitalsWithDistance = hospitals.map(hospital => {
        const distance = calculateDistance(
          coords.latitude,
          coords.longitude,
          hospital.location.latitude,
          hospital.location.longitude
        );
        
        return {
          ...hospital,
          distance
        };
      });
      
      // Sort by distance and limit to 5
      const sorted = hospitalsWithDistance.sort((a, b) => a.distance - b.distance).slice(0, 5);
      
      setNearbyHospitals(sorted);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      Alert.alert('Error', 'Failed to fetch nearby hospitals');
    }
  };
  
  // Trigger emergency assistance
  const triggerEmergency = async () => {
    try {
      setEmergencyMode(true);
      
      if (!location) {
        Alert.alert('Error', 'Location data is required for emergency services');
        setEmergencyMode(false);
        return;
      }
      
      // Prepare emergency request data
      const emergencyRequest = {
        user_location: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        emergency_type: 'Medical'
      };
      
      // Submit emergency request
      const response = await fetch(`${API_URL}/emergency`, {
        method: 'POST',
        headers: {
          'user-id': 'demo-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emergencyRequest),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process emergency request');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setEmergencyResponse(result.emergency);
        
        // Navigate to emergency details screen
        navigation.navigate('EmergencyDetails', { emergency: result.emergency });
      } else {
        throw new Error(result.error || 'Unknown error processing emergency');
      }
    } catch (error) {
      console.error('Error triggering emergency:', error);
      Alert.alert('Error', error.message || 'Failed to process emergency request');
    } finally {
      setEmergencyMode(false);
    }
  };
  
  // Calculate distance between two points using the Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };
  
  // Convert degrees to radians
  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };
  
  // Format distance for display
  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    } else {
      return `${distance.toFixed(1)} km`;
    }
  };
  
  // Set current location as safe zone center
  const setSafeZoneHere = () => {
    if (location) {
      setSafeZoneCenter(location);
      Alert.alert('Safe Zone Updated', 'Your safe zone has been set to your current location');
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading emergency services...</Text>
      </View>
    );
  }
  
  if (locationError) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color="#e74c3c" />
        <Text style={styles.errorText}>{locationError}</Text>
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
  
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.headerSurface}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Title style={styles.headerTitle}>Emergency Services</Title>
            <Paragraph style={styles.headerSubtitle}>
              Healthcare on IOTA TestNet
            </Paragraph>
          </View>
          <View style={styles.walletInfo}>
            <Text style={styles.balanceText}>{balance} MEDAI</Text>
            <Text style={styles.balanceLabel}>Balance</Text>
          </View>
        </View>
      </Surface>
      
      <View style={styles.safeZoneContainer}>
        <Surface style={styles.safeZoneSurface}>
          <View style={styles.safeZoneHeader}>
            <MaterialIcons 
              name={insideSafeZone ? "check-circle" : "warning"} 
              size={24} 
              color={insideSafeZone ? "#4CAF50" : "#FF9800"} 
            />
            <Text style={styles.safeZoneTitle}>
              {insideSafeZone ? "Inside Safe Zone" : "Outside Safe Zone"}
            </Text>
          </View>
          <Text style={styles.safeZoneDescription}>
            {insideSafeZone 
              ? "You are currently inside your designated safe zone." 
              : "Warning: You have left your designated safe zone."}
          </Text>
          <Button 
            mode="outlined" 
            icon="map-marker"
            onPress={setSafeZoneHere}
            style={styles.safeZoneButton}
          >
            Set Safe Zone Here
          </Button>
        </Surface>
      </View>
      
      <View style={styles.emergencyContainer}>
        <TouchableOpacity 
          style={styles.emergencyButton}
          onPress={triggerEmergency}
          disabled={emergencyMode}
        >
          <MaterialIcons name="local-hospital" size={48} color="#ffffff" />
          <Text style={styles.emergencyButtonText}>
            {emergencyMode ? "Processing..." : "Emergency Assistance"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.emergencyDescription}>
          Tap above to request immediate emergency assistance
        </Text>
      </View>
      
      <View style={styles.hospitalList}>
        <Title style={styles.sectionTitle}>Nearby Hospitals</Title>
        
        {nearbyHospitals.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Paragraph style={styles.emptyText}>
                No hospitals found nearby. Add hospitals to the blockchain registry.
              </Paragraph>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('RegisterHospital')}
                style={styles.addButton}
              >
                Register Hospital
              </Button>
            </Card.Content>
          </Card>
        ) : (
          nearbyHospitals.map((hospital) => (
            <Card 
              key={hospital.id}
              style={styles.hospitalCard}
              onPress={() => navigation.navigate('HospitalDetails', { hospitalId: hospital.id })}
            >
              <Card.Content>
                <Title>{hospital.name}</Title>
                <Paragraph>
                  {hospital.location.address}, {hospital.location.city}
                </Paragraph>
                <View style={styles.hospitalCardFooter}>
                  <View style={styles.distanceContainer}>
                    <MaterialIcons name="directions" size={16} color="#666" />
                    <Text style={styles.distanceText}>
                      {formatDistance(hospital.distance)}
                    </Text>
                  </View>
                  <View style={styles.emergencyContainer}>
                    <MaterialIcons 
                      name="local-hospital" 
                      size={16} 
                      color={hospital.emergency_capacity > 0 ? "#4CAF50" : "#999"} 
                    />
                    <Text style={[
                      styles.emergencyCapacityText,
                      { color: hospital.emergency_capacity > 0 ? "#4CAF50" : "#999" }
                    ]}>
                      {hospital.emergency_capacity > 0 
                        ? `Emergency: ${hospital.emergency_capacity} beds` 
                        : "No emergency"}
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
        
        <Button 
          mode="outlined" 
          icon="plus"
          onPress={() => navigation.navigate('RegisterHospital')}
          style={styles.registerButton}
        >
          Register New Hospital
        </Button>
      </View>
      
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          icon="ambulance"
          onPress={() => navigation.navigate('HospitalList')}
          style={styles.actionButton}
        >
          View All Hospitals
        </Button>
        <Button
          mode="outlined"
          icon="shield-account"
          onPress={() => navigation.navigate('UserLocation')}
          style={styles.actionButton}
        >
          Safe Zone Settings
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
    marginTop: 20,
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
    marginTop: 20,
    marginBottom: 20,
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
  },
  errorButton: {
    marginTop: 20,
  },
  headerSurface: {
    elevation: 4,
    borderRadius: 0,
    backgroundColor: '#6200ee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  walletInfo: {
    alignItems: 'flex-end',
  },
  balanceText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  safeZoneContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  safeZoneSurface: {
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  safeZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  safeZoneTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  safeZoneDescription: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  safeZoneButton: {
    marginTop: 12,
  },
  emergencyContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  emergencyButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 50,
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  emergencyDescription: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  hospitalList: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 12,
  },
  hospitalCard: {
    marginBottom: 12,
  },
  hospitalCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distanceText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  emergencyCapacityText: {
    marginLeft: 4,
    fontSize: 14,
  },
  emptyCard: {
    marginBottom: 16,
    padding: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  addButton: {
    marginTop: 8,
  },
  registerButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  buttonContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 12,
  },
});

export default HospitalHomeScreen;