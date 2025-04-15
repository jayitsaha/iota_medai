import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput
} from 'react-native';
import {
  Button,
  Title,
  Paragraph,
  Surface,
  Switch,
  TextInput,
  Card,
  List,
  Dialog,
  Portal,
  Divider,
  Slider
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
// import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constants
const STORAGE_KEY_SAFE_ZONES = '@safe_zones';
const STORAGE_KEY_ACTIVE_ZONE = '@active_safe_zone';
const STORAGE_KEY_MONITORING = '@monitoring_enabled';
const STORAGE_KEY_AUTO_EMERGENCY = '@auto_emergency_enabled';
const DEFAULT_RADIUS = 500; // meters

const UserLocationScreen = ({ navigation }) => {
  // Location state
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [locationSubscription, setLocationSubscription] = useState(null);
  
  // Safe zone state
  const [safeZones, setSafeZones] = useState([]);
  const [activeSafeZone, setActiveSafeZone] = useState(null);
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const [autoEmergencyEnabled, setAutoEmergencyEnabled] = useState(false);
  const [insideSafeZone, setInsideSafeZone] = useState(true);
  
  // Map refs
  const mapRef = useRef(null);
  
  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneRadius, setNewZoneRadius] = useState(DEFAULT_RADIUS);
  const [editingZone, setEditingZone] = useState(null);
  
  // Load saved data
  useEffect(() => {
    loadSavedData();
    getCurrentLocation();
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);
  
  // Check if inside safe zone when location or active zone changes
  useEffect(() => {
    if (currentLocation && activeSafeZone) {
      checkIfInsideSafeZone();
    }
  }, [currentLocation, activeSafeZone]);
  
  // Load saved data from storage
  const loadSavedData = async () => {
    try {
      // Load safe zones
      const savedZones = await AsyncStorage.getItem(STORAGE_KEY_SAFE_ZONES);
      if (savedZones) {
        setSafeZones(JSON.parse(savedZones));
      }
      
      // Load active zone
      const savedActiveZone = await AsyncStorage.getItem(STORAGE_KEY_ACTIVE_ZONE);
      if (savedActiveZone) {
        setActiveSafeZone(JSON.parse(savedActiveZone));
      }
      
      // Load monitoring setting
      const savedMonitoring = await AsyncStorage.getItem(STORAGE_KEY_MONITORING);
      if (savedMonitoring) {
        setMonitoringEnabled(JSON.parse(savedMonitoring));
      }
      
      // Load auto emergency setting
      const savedAutoEmergency = await AsyncStorage.getItem(STORAGE_KEY_AUTO_EMERGENCY);
      if (savedAutoEmergency) {
        setAutoEmergencyEnabled(JSON.parse(savedAutoEmergency));
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  };
  
  // Get current location
  const getCurrentLocation = async () => {
    setLoading(true);
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Location permission is required for safe zone monitoring');
        setLoading(false);
        return;
      }
      
      // Get initial location
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setCurrentLocation(location.coords);
      
      // Start location tracking if monitoring is enabled
      if (monitoringEnabled) {
        startLocationTracking();
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationError(`Error getting location: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Start tracking location
  const startLocationTracking = async () => {
    try {
      // Stop any existing subscription
      if (locationSubscription) {
        await locationSubscription.remove();
      }
      
      // Start a new subscription
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setCurrentLocation(newLocation.coords);
        }
      );
      
      setLocationSubscription(subscription);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      Alert.alert('Error', `Could not start location tracking: ${error.message}`);
    }
  };
  
  // Stop tracking location
  const stopLocationTracking = async () => {
    try {
      if (locationSubscription) {
        await locationSubscription.remove();
        setLocationSubscription(null);
      }
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  };
  
  // Check if inside safe zone
  const checkIfInsideSafeZone = () => {
    if (!activeSafeZone || !currentLocation) return;
    
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      activeSafeZone.latitude,
      activeSafeZone.longitude
    );
    
    // Convert to meters
    const distanceInMeters = distance * 1000;
    
    // Check if inside safe zone
    const inside = distanceInMeters <= activeSafeZone.radius;
    setInsideSafeZone(inside);
    
    // Trigger alert if left safe zone and auto emergency is enabled
    if (!inside && autoEmergencyEnabled) {
      triggerSafeZoneAlert();
    }
  };
  
  // Trigger safe zone alert
  const triggerSafeZoneAlert = () => {
    Alert.alert(
      'Safe Zone Alert',
      `You have left your safe zone "${activeSafeZone.name}". Do you need emergency assistance?`,
      [
        {
          text: 'No, I\'m fine',
          style: 'cancel',
        },
        {
          text: 'Yes, Emergency',
          style: 'destructive',
          onPress: () => navigation.navigate('HospitalHome'),
        },
      ]
    );
  };
  
  // Calculate distance between two points
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
  
  // Toggle monitoring state
  const toggleMonitoring = async (value) => {
    setMonitoringEnabled(value);
    
    // Save the setting
    await AsyncStorage.setItem(STORAGE_KEY_MONITORING, JSON.stringify(value));
    
    // Start or stop tracking based on new value
    if (value) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  };
  
  // Toggle auto emergency
  const toggleAutoEmergency = async (value) => {
    setAutoEmergencyEnabled(value);
    
    // Save the setting
    await AsyncStorage.setItem(STORAGE_KEY_AUTO_EMERGENCY, JSON.stringify(value));
    
    // If enabling, make sure monitoring is also enabled
    if (value && !monitoringEnabled) {
      toggleMonitoring(true);
    }
  };
  
  // Show add/edit safe zone dialog
  const showAddZoneDialog = (zone = null) => {
    if (zone) {
      // Editing existing zone
      setEditingZone(zone);
      setNewZoneName(zone.name);
      setNewZoneRadius(zone.radius);
    } else {
      // Adding new zone
      setEditingZone(null);
      setNewZoneName('');
      setNewZoneRadius(DEFAULT_RADIUS);
    }
    
    setDialogVisible(true);
  };
  
  // Hide dialog
  const hideDialog = () => {
    setDialogVisible(false);
    setEditingZone(null);
  };
  
  // Add current location as safe zone
  const addCurrentLocationAsZone = () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Current location is not available');
      return;
    }
    
    // Show dialog with current location pre-selected
    setEditingZone({
      id: Date.now().toString(),
      name: '',
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      radius: DEFAULT_RADIUS,
    });
    
    setNewZoneName('');
    setNewZoneRadius(DEFAULT_RADIUS);
    setDialogVisible(true);
  };
  
  // Save safe zone
  const saveSafeZone = async () => {
    if (!newZoneName.trim()) {
      Alert.alert('Error', 'Please enter a name for the safe zone');
      return;
    }
    
    let updatedZones = [...safeZones];
    
    if (editingZone) {
      // Update existing zone
      const index = updatedZones.findIndex(zone => zone.id === editingZone.id);
      
      if (index !== -1) {
        updatedZones[index] = {
          ...editingZone,
          name: newZoneName,
          radius: newZoneRadius,
        };
      }
    } else {
      // Add new zone
      const newZone = {
        id: Date.now().toString(),
        name: newZoneName,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        radius: newZoneRadius,
      };
      
      updatedZones.push(newZone);
    }
    
    // Update state and save to storage
    setSafeZones(updatedZones);
    await AsyncStorage.setItem(STORAGE_KEY_SAFE_ZONES, JSON.stringify(updatedZones));
    
    // If this is the first zone, make it active
    if (updatedZones.length === 1 && !activeSafeZone) {
      setActiveSafeZone(updatedZones[0]);
      await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_ZONE, JSON.stringify(updatedZones[0]));
    }
    
    // Hide dialog
    hideDialog();
  };
  
  // Set active safe zone
  const setActiveZone = async (zone) => {
    setActiveSafeZone(zone);
    await AsyncStorage.setItem(STORAGE_KEY_ACTIVE_ZONE, JSON.stringify(zone));
    
    // Focus map on this zone
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: zone.latitude,
        longitude: zone.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
    
    // Check if inside this zone
    checkIfInsideSafeZone();
  };
  
  // Delete safe zone
  const deleteZone = async (zone) => {
    Alert.alert(
      'Delete Safe Zone',
      `Are you sure you want to delete the safe zone "${zone.name}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedZones = safeZones.filter(z => z.id !== zone.id);
            setSafeZones(updatedZones);
            await AsyncStorage.setItem(STORAGE_KEY_SAFE_ZONES, JSON.stringify(updatedZones));
            
            // If this was the active zone, clear active zone
            if (activeSafeZone && activeSafeZone.id === zone.id) {
              setActiveSafeZone(null);
              await AsyncStorage.removeItem(STORAGE_KEY_ACTIVE_ZONE);
            }
          },
        },
      ]
    );
  };
  
  // Get safe zone status text and color
  const getSafeZoneStatus = () => {
    if (!activeSafeZone) {
      return {
        text: 'No active safe zone',
        color: '#757575',
      };
    }
    
    if (!monitoringEnabled) {
      return {
        text: 'Monitoring disabled',
        color: '#FFA000',
      };
    }
    
    if (insideSafeZone) {
      return {
        text: 'Inside safe zone',
        color: '#4CAF50',
      };
    } else {
      return {
        text: 'Outside safe zone',
        color: '#F44336',
      };
    }
  };
  
  // Focus map on current location
  const focusMapOnCurrentLocation = () => {
    if (!mapRef.current || !currentLocation) return;
    
    mapRef.current.animateToRegion({
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  };
  
  // Focus map on active safe zone
  const focusMapOnActiveZone = () => {
    if (!mapRef.current || !activeSafeZone) return;
    
    mapRef.current.animateToRegion({
      latitude: activeSafeZone.latitude,
      longitude: activeSafeZone.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  };
  
  // Format radius for display
  const formatRadius = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    } else {
      return `${meters} m`;
    }
  };
  
  const statusInfo = getSafeZoneStatus();
  
  return (
    <View style={styles.container}>
      <Surface style={styles.headerSurface}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Safe Zone Settings</Title>
        </View>
      </Surface>
      
      <ScrollView style={styles.scrollView}>
        {/* Map View */}
        {/* <View style={styles.mapContainer}>
          {currentLocation ? (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
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
              
              {activeSafeZone && (
                <>
                  <Marker
                    coordinate={{
                      latitude: activeSafeZone.latitude,
                      longitude: activeSafeZone.longitude,
                    }}
                    title={activeSafeZone.name}
                    description="Safe Zone Center"
                    pinColor="green"
                  >
                    <MaterialIcons name="home" size={24} color="green" />
                  </Marker>
                  
                  <Circle
                    center={{
                      latitude: activeSafeZone.latitude,
                      longitude: activeSafeZone.longitude,
                    }}
                    radius={activeSafeZone.radius}
                    fillColor="rgba(76, 175, 80, 0.2)"
                    strokeColor="rgba(76, 175, 80, 0.5)"
                    strokeWidth={2}
                  />
                </>
              )}
              
              {safeZones
                .filter(zone => !activeSafeZone || zone.id !== activeSafeZone.id)
                .map(zone => (
                  <Circle
                    key={zone.id}
                    center={{
                      latitude: zone.latitude,
                      longitude: zone.longitude,
                    }}
                    radius={zone.radius}
                    fillColor="rgba(150, 150, 150, 0.2)"
                    strokeColor="rgba(150, 150, 150, 0.5)"
                    strokeWidth={1}
                  />
                ))
              }
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <MaterialIcons name="location-off" size={48} color="#cecece" />
              <Text style={styles.mapPlaceholderText}>
                {locationError || 'Loading location...'}
              </Text>
            </View>
          )}
          
          <View style={styles.mapButtonsContainer}>
            <TouchableOpacity
              style={styles.mapButton}
              onPress={focusMapOnCurrentLocation}
              disabled={!currentLocation}
            >
              <MaterialIcons name="my-location" size={24} color="#6200ee" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.mapButton}
              onPress={focusMapOnActiveZone}
              disabled={!activeSafeZone}
            >
              <MaterialIcons name="home" size={24} color="#6200ee" />
            </TouchableOpacity>
          </View>
        </View> */}
        
        {/* Status Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.statusHeader}>
              <Title style={styles.statusTitle}>Current Status</Title>
              <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
                <MaterialIcons
                  name={insideSafeZone ? "check-circle" : "warning"}
                  size={16}
                  color={statusInfo.color}
                />
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.text}
                </Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Safe Zone Monitoring</Text>
                <Text style={styles.settingDescription}>
                  Track your location and alert when you leave safe zones
                </Text>
              </View>
              <Switch
                value={monitoringEnabled}
                onValueChange={toggleMonitoring}
                color="#6200ee"
              />
            </View>
            
            <View style={styles.settingRow}>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Auto Emergency Alert</Text>
                <Text style={styles.settingDescription}>
                  Automatically prompt for emergency when leaving safe zone
                </Text>
              </View>
              <Switch
                value={autoEmergencyEnabled}
                onValueChange={toggleAutoEmergency}
                color="#6200ee"
                disabled={!monitoringEnabled}
              />
            </View>
            
            {activeSafeZone && (
              <View style={styles.activeZoneInfo}>
                <Text style={styles.activeZoneLabel}>Active Safe Zone:</Text>
                <Text style={styles.activeZoneName}>{activeSafeZone.name}</Text>
                <Text style={styles.activeZoneRadius}>
                  Radius: {formatRadius(activeSafeZone.radius)}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
        
        {/* Safe Zones List Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Your Safe Zones</Title>
            
            {safeZones.length > 0 ? (
              <List.Section>
                {safeZones.map(zone => (
                  <List.Item
                    key={zone.id}
                    title={zone.name}
                    description={`Radius: ${formatRadius(zone.radius)}`}
                    left={props => (
                      <List.Icon
                        {...props}
                        icon={activeSafeZone && zone.id === activeSafeZone.id ? "check-circle" : "circle-outline"}
                        color={activeSafeZone && zone.id === activeSafeZone.id ? "#4CAF50" : "#757575"}
                      />
                    )}
                    right={props => (
                      <View style={styles.zoneActions}>
                        <TouchableOpacity 
                          onPress={() => showAddZoneDialog(zone)}
                          style={styles.zoneActionButton}
                        >
                          <MaterialIcons name="edit" size={20} color="#757575" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => deleteZone(zone)}
                          style={styles.zoneActionButton}
                        >
                          <MaterialIcons name="delete" size={20} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    )}
                    onPress={() => setActiveZone(zone)}
                    style={styles.zoneItem}
                  />
                ))}
              </List.Section>
            ) : (
              <Paragraph style={styles.noZonesText}>
                You haven't added any safe zones yet
              </Paragraph>
            )}
          </Card.Content>
          
          <Card.Actions style={styles.cardActions}>
            <Button
              mode="contained"
              icon="map-marker-plus"
              onPress={addCurrentLocationAsZone}
              disabled={!currentLocation}
            >
              Add Current Location
            </Button>
          </Card.Actions>
        </Card>
        
        <Paragraph style={styles.infoText}>
          Safe zones help monitor your location and can automatically alert emergency services
          when you leave designated areas. This is especially helpful for elderly individuals
          or those with medical conditions that require monitoring.
        </Paragraph>
      </ScrollView>
      
      {/* Add/Edit Safe Zone Dialog */}
      <Portal>
        <Dialog visible={dialogVisible} onDismiss={hideDialog}>
          <Dialog.Title>
            {editingZone ? 'Edit Safe Zone' : 'Add Safe Zone'}
          </Dialog.Title>
          
          <Dialog.Content>
            <TextInput
              label="Zone Name"
              value={newZoneName}
              onChangeText={setNewZoneName}
              style={styles.dialogInput}
              mode="outlined"
            />
            
            <Text style={styles.radiusLabel}>
              Safe Zone Radius: {formatRadius(newZoneRadius)}
            </Text>
            
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>100m</Text>
              <Slider
                value={newZoneRadius}
                onValueChange={setNewZoneRadius}
                minimumValue={100}
                maximumValue={2000}
                step={50}
                style={styles.slider}
              />
              <Text style={styles.sliderValue}>2km</Text>
            </View>
          </Dialog.Content>
          
          <Dialog.Actions>
            <Button onPress={hideDialog}>Cancel</Button>
            <Button onPress={saveSafeZone} mode="contained">Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerSurface: {
    elevation: 4,
    backgroundColor: '#6200ee',
  },
  header: {
    padding: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  mapContainer: {
    height: 250,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  mapPlaceholderText: {
    marginTop: 16,
    color: '#757575',
    textAlign: 'center',
  },
  mapButtonsContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  mapButton: {
    backgroundColor: 'white',
    borderRadius: 30,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    marginLeft: 4,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingDescription: {
    fontSize: 14,
    color: '#757575',
  },
  activeZoneInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  activeZoneLabel: {
    fontSize: 14,
    color: '#388E3C',
    marginBottom: 4,
  },
  activeZoneName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeZoneRadius: {
    fontSize: 14,
    color: '#388E3C',
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  noZonesText: {
    textAlign: 'center',
    color: '#757575',
    fontStyle: 'italic',
    marginVertical: 24,
  },
  zoneItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  zoneActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneActionButton: {
    padding: 8,
  },
  cardActions: {
    justifyContent: 'center',
    paddingTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 24,
    lineHeight: 20,
    textAlign: 'center',
  },
  dialogInput: {
    marginBottom: 16,
  },
  radiusLabel: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 16,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  slider: {
    flex: 1,
    marginHorizontal: 8,
  },
  sliderValue: {
    fontSize: 12,
    color: '#757575',
    width: 32,
  },
});

export default UserLocationScreen;