import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  RefreshControl
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  ActivityIndicator,
  Divider,
  Surface,
  List,
  Badge,
  IconButton,
  ToggleButton,
  Menu
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
// import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG.API_URL || 'http://localhost:3000/api';

const HospitalDetailsScreen = ({ route, navigation }) => {
  const { hospitalId, initialTab } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hospital, setHospital] = useState(null);
  const [ambulances, setAmbulances] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab || 'details');
  const [menuVisible, setMenuVisible] = useState(false);
  
  const mapRef = useRef(null);
  
  // Fetch hospital details on component mount
  useEffect(() => {
    fetchHospitalDetails();
    getCurrentLocation();
  }, [hospitalId]);
  
  // Get current location
  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }
      
      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };
  
  // Fetch hospital details
  const fetchHospitalDetails = async () => {
    setLoading(true);
    
    try {
      // Fetch hospital data
      const response = await fetch(`${API_URL}/hospitals/${hospitalId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch hospital details');
      }
      
      const data = await response.json();
      setHospital(data);
      
      // Also fetch ambulances for this hospital
      fetchHospitalAmbulances();
    } catch (error) {
      console.error('Error fetching hospital details:', error);
      Alert.alert('Error', 'Failed to fetch hospital details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch ambulances for this hospital
  const fetchHospitalAmbulances = async () => {
    try {
      const response = await fetch(`${API_URL}/hospitals/${hospitalId}/ambulances`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch hospital ambulances');
      }
      
      const data = await response.json();
      setAmbulances(data);
    } catch (error) {
      console.error('Error fetching hospital ambulances:', error);
      setAmbulances([]);
    }
  };
  
  // Refresh all data
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchHospitalDetails(),
      fetchHospitalAmbulances()
    ]);
    setRefreshing(false);
  };
  
  // Calculate distance between hospital and current location
  const calculateDistance = () => {
    if (!currentLocation || !hospital?.location) return null;
    
    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(hospital.location.latitude - currentLocation.latitude);
    const dLon = deg2rad(hospital.location.longitude - currentLocation.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(currentLocation.latitude)) * Math.cos(deg2rad(hospital.location.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };
  
  // Format distance for display
  const formatDistance = (distance) => {
    if (distance === null || distance === undefined) return '';
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m away`;
    } else {
      return `${distance.toFixed(1)} km away`;
    }
  };
  
  // Convert degrees to radians
  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };
  
  // Format phone number for calling
  const formatPhoneNumber = (phoneNumber) => {
    return phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
  };
  
  // Open phone dialer
  const callHospital = (type = 'regular') => {
    if (!hospital) return;
    
    const number = type === 'emergency' ? 
      hospital.contact.emergency_phone : 
      hospital.contact.phone;
    
    if (!number) {
      Alert.alert('Error', 'No phone number available');
      return;
    }
    
    Linking.openURL(`tel:${formatPhoneNumber(number)}`)
      .catch(error => {
        console.error('Error opening phone dialer:', error);
        Alert.alert('Error', 'Could not open phone dialer');
      });
  };
  
  // Open email app
  const emailHospital = () => {
    if (!hospital?.contact?.email) {
      Alert.alert('Error', 'No email address available');
      return;
    }
    
    Linking.openURL(`mailto:${hospital.contact.email}`)
      .catch(error => {
        console.error('Error opening email:', error);
        Alert.alert('Error', 'Could not open email application');
      });
  };
  
  // Open maps app with directions
  const openDirections = () => {
    if (!hospital?.location) {
      Alert.alert('Error', 'No location data available');
      return;
    }
    
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
  
  // Open website
  const openWebsite = () => {
    if (!hospital?.contact?.website) {
      Alert.alert('Error', 'No website available');
      return;
    }
    
    let url = hospital.contact.website;
    
    // Add https:// if not present
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    Linking.openURL(url)
      .catch(error => {
        console.error('Error opening website:', error);
        Alert.alert('Error', 'Could not open website');
      });
  };
  
  // Focus map on hospital location
  const focusMap = () => {
    if (!mapRef.current || !hospital?.location) return;
    
    mapRef.current.animateToRegion({
      latitude: hospital.location.latitude,
      longitude: hospital.location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 1000);
  };
  
  // Update ambulance status
  const updateAmbulanceStatus = async (ambulanceId, newStatus) => {
    try {
      const response = await fetch(`${API_URL}/ambulances/${ambulanceId}/status`, {
        method: 'PUT',
        headers: {
          'user-id': 'demo-user',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update ambulance status');
      }
      
      // Refresh ambulances list
      fetchHospitalAmbulances();
      
      Alert.alert('Success', `Ambulance status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating ambulance status:', error);
      Alert.alert('Error', 'Failed to update ambulance status');
    }
  };
  
  // Handle ambulance action menu
  const handleAmbulanceAction = (ambulance, action) => {
    switch (action) {
      case 'available':
        updateAmbulanceStatus(ambulance.id, 'Available');
        break;
      case 'dispatched':
        updateAmbulanceStatus(ambulance.id, 'Dispatched');
        break;
      case 'maintenance':
        updateAmbulanceStatus(ambulance.id, 'Maintenance');
        break;
      case 'edit':
        navigation.navigate('EditAmbulance', { ambulanceId: ambulance.id, hospitalId });
        break;
      default:
        break;
    }
    
    setMenuVisible(false);
  };
  
  // Get ambulance status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Available':
        return '#4CAF50';
      case 'Dispatched':
        return '#F44336';
      case 'Maintenance':
        return '#FF9800';
      case 'Returning':
        return '#2196F3';
      default:
        return '#757575';
    }
  };
  
  // Render hospital details tab
  const renderDetailsTab = () => (
    <View style={styles.tabContent}>
      {/* Basic Info */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Hospital Information</Title>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={20} color="#666" />
            <Text style={styles.infoText}>
              {hospital.location.address}, {hospital.location.city}, {hospital.location.state} {hospital.location.postal_code}
            </Text>
          </View>
          
          {hospital.contact.phone && (
            <View style={styles.infoRow}>
              <MaterialIcons name="phone" size={20} color="#666" />
              <Text style={styles.infoText}>{hospital.contact.phone}</Text>
            </View>
          )}
          
          {hospital.contact.emergency_phone && (
            <View style={styles.infoRow}>
              <MaterialIcons name="emergency" size={20} color="#e74c3c" />
              <Text style={[styles.infoText, { color: '#e74c3c' }]}>
                {hospital.contact.emergency_phone}
              </Text>
            </View>
          )}
          
          {hospital.contact.email && (
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={20} color="#666" />
              <Text style={styles.infoText}>{hospital.contact.email}</Text>
            </View>
          )}
          
          {hospital.contact.website && (
            <View style={styles.infoRow}>
              <MaterialIcons name="language" size={20} color="#666" />
              <Text style={styles.infoText}>{hospital.contact.website}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <MaterialIcons name="local-hospital" size={20} color="#666" />
            <Text style={styles.infoText}>
              Emergency Capacity: {hospital.emergency_capacity} beds
            </Text>
          </View>
          
          {currentLocation && (
            <View style={styles.infoRow}>
              <MaterialIcons name="directions" size={20} color="#666" />
              <Text style={styles.infoText}>
                {formatDistance(calculateDistance())}
              </Text>
            </View>
          )}
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="text" 
            icon="phone" 
            onPress={() => callHospital()}
          >
            Call
          </Button>
          
          <Button 
            mode="text" 
            icon="email" 
            onPress={emailHospital}
          >
            Email
          </Button>
          
          <Button 
            mode="text" 
            icon="web" 
            onPress={openWebsite}
          >
            Website
          </Button>
        </Card.Actions>
      </Card>
      
      {/* Map */}
      {hospital.location && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Location</Title>
            
            <View style={styles.mapContainer}>
              {/* <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                  latitude: hospital.location.latitude,
                  longitude: hospital.location.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onMapReady={() => setMapReady(true)}
              >
                <Marker
                  coordinate={{
                    latitude: hospital.location.latitude,
                    longitude: hospital.location.longitude,
                  }}
                  title={hospital.name}
                  description={hospital.location.address}
                >
                  <MaterialIcons name="local-hospital" size={30} color="#e74c3c" />
                </Marker>
                
                {currentLocation && (
                  <Marker
                    coordinate={{
                      latitude: currentLocation.latitude,
                      longitude: currentLocation.longitude,
                    }}
                    title="Your Location"
                    pinColor="blue"
                  />
                )}
              </MapView> */}
            </View>
          </Card.Content>
          
          <Card.Actions style={styles.cardActions}>
            <Button 
              mode="contained" 
              icon="directions" 
              onPress={openDirections}
            >
              Get Directions
            </Button>
            
            <Button 
              mode="outlined" 
              icon="crosshairs-gps" 
              onPress={focusMap}
            >
              Focus Map
            </Button>
          </Card.Actions>
        </Card>
      )}
      
      {/* Services */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Services Offered</Title>
          
          {hospital.services && hospital.services.length > 0 ? (
            <View style={styles.servicesContainer}>
              {hospital.services.map((service, index) => (
                <Chip
                  key={index}
                  style={styles.serviceChip}
                  mode="flat"
                >
                  {service}
                </Chip>
              ))}
            </View>
          ) : (
            <Paragraph style={styles.noDataText}>
              No services listed for this hospital
            </Paragraph>
          )}
        </Card.Content>
      </Card>
      
      {/* Blockchain Information */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.blockchainHeader}>
            <Title style={styles.cardTitle}>Blockchain Information</Title>
            
            {hospital.blockchainTransactionId && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={16} color="#4CAF50" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          
          {hospital.blockchainTransactionId ? (
            <>
              <Paragraph style={styles.blockchainLabel}>
                Transaction ID:
              </Paragraph>
              <Paragraph style={styles.blockchainValue}>
                {hospital.blockchainTransactionId}
                {console.log(hospital.blockchainTransactionId)}
              </Paragraph>
              
              <Paragraph style={styles.blockchainLabel}>
                Blockchain Status:
              </Paragraph>
              <Paragraph style={styles.blockchainValue}>
                {hospital.blockchainStatus || 'Confirmed'}
              </Paragraph>
              
              <Paragraph style={styles.blockchainInfo}>
                This hospital's information is securely recorded on the IOTA Tangle blockchain, 
                ensuring authenticity and immutability of the data.
              </Paragraph>
            </>
          ) : (
            <Paragraph style={styles.noDataText}>
              This hospital is not yet verified on the blockchain
            </Paragraph>
          )}
        </Card.Content>
      </Card>
      
      {/* Emergency Call */}
      <Button
        mode="contained"
        icon="phone-alert"
        onPress={() => callHospital('emergency')}
        style={styles.emergencyButton}
        labelStyle={styles.emergencyButtonLabel}
      >
        Call Emergency Line
      </Button>
    </View>
  );
  
  // Render ambulances tab
  const renderAmbulancesTab = () => (
    <View style={styles.tabContent}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.ambulanceHeader}>
            <Title style={styles.cardTitle}>Hospital Ambulances</Title>
            <Badge
              size={24}
              style={{
                backgroundColor: '#6200ee',
              }}
            >
              {ambulances.length}
            </Badge>
          </View>
          
          {ambulances.length > 0 ? (
            <List.Section>
              {ambulances.map((ambulance) => (
                <List.Item
                  key={ambulance.id}
                  title={ambulance.registration_number}
                  description={`${ambulance.vehicle_type} • Capacity: ${ambulance.capacity}`}
                  left={() => (
                    <List.Icon 
                      icon="ambulance" 
                      color={getStatusColor(ambulance.current_status)} 
                    />
                  )}
                  right={() => (
                    <View style={styles.ambulanceActions}>
                      <Chip 
                        style={[
                          styles.statusChip, 
                          { backgroundColor: getStatusColor(ambulance.current_status) + '20' }
                        ]}
                        textStyle={{ color: getStatusColor(ambulance.current_status) }}
                      >
                        {ambulance.current_status}
                      </Chip>
                      
                      <Menu
                        visible={ambulance.menuVisible}
                        onDismiss={() => {
                          setAmbulances(ambulances.map(a => ({
                            ...a,
                            menuVisible: a.id === ambulance.id ? false : a.menuVisible
                          })));
                        }}
                        anchor={
                          <IconButton
                            icon="dots-vertical"
                            size={20}
                            onPress={() => {
                              setAmbulances(ambulances.map(a => ({
                                ...a,
                                menuVisible: a.id === ambulance.id ? true : false
                              })));
                            }}
                          />
                        }
                      >
                        <Menu.Item 
                          title="Set Available" 
                          leadingIcon="check-circle"
                          onPress={() => handleAmbulanceAction(ambulance, 'available')} 
                        />
                        <Menu.Item 
                          title="Set Dispatched" 
                          leadingIcon="send" 
                          onPress={() => handleAmbulanceAction(ambulance, 'dispatched')} 
                        />
                        <Menu.Item 
                          title="Set Maintenance" 
                          leadingIcon="wrench" 
                          onPress={() => handleAmbulanceAction(ambulance, 'maintenance')} 
                        />
                        <Divider />
                        <Menu.Item 
                          title="Edit Details" 
                          leadingIcon="pencil" 
                          onPress={() => handleAmbulanceAction(ambulance, 'edit')} 
                        />
                      </Menu>
                    </View>
                  )}
                  style={styles.ambulanceItem}
                />
              ))}
            </List.Section>
          ) : (
            <Paragraph style={styles.noDataText}>
              No ambulances registered for this hospital
            </Paragraph>
          )}
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => navigation.navigate('AddAmbulance', { 
              hospitalId: hospital.id,
              hospitalName: hospital.name
            })}
          >
            Add Ambulance
          </Button>
        </Card.Actions>
      </Card>
      
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Ambulance Statistics</Title>
          
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {ambulances.length}
              </Text>
              <Text style={styles.statLabel}>
                Total
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {ambulances.filter(a => a.current_status === 'Available').length}
              </Text>
              <Text style={styles.statLabel}>
                Available
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {ambulances.filter(a => a.current_status === 'Dispatched').length}
              </Text>
              <Text style={styles.statLabel}>
                Dispatched
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {ambulances.filter(a => a.current_status === 'Maintenance').length}
              </Text>
              <Text style={styles.statLabel}>
                Maintenance
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading hospital details...</Text>
      </View>
    );
  }
  
  if (!hospital) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={64} color="#e74c3c" />
        <Text style={styles.errorText}>Hospital not found</Text>
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
    <View style={styles.container}>
      <Surface style={styles.headerSurface}>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>{hospital.name}</Title>
          
          {hospital.blockchainTransactionId && (
            <MaterialIcons name="verified" size={24} color="#fff" />
          )}
        </View>
        
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.activeTab]}
            onPress={() => setActiveTab('details')}
          >
            <MaterialIcons
              name="info"
              size={20}
              color={activeTab === 'details' ? '#6200ee' : '#666'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'details' && styles.activeTabText,
              ]}
            >
              Details
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'ambulances' && styles.activeTab]}
            onPress={() => setActiveTab('ambulances')}
          >
            <MaterialIcons
              name="ambulance"
              size={20}
              color={activeTab === 'ambulances' ? '#6200ee' : '#666'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'ambulances' && styles.activeTabText,
              ]}
            >
              Ambulances
            </Text>
            
            {ambulances.length > 0 && (
              <Badge
                size={18}
                style={styles.badge}
              >
                {ambulances.length}
              </Badge>
            )}
          </TouchableOpacity>
        </View>
      </Surface>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6200ee"]}
          />
        }
      >
        {activeTab === 'details' ? renderDetailsTab() : renderAmbulancesTab()}
      </ScrollView>
    </View>
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
    backgroundColor: '#6200ee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#6200ee',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 24,
    backgroundColor: '#6200ee',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tabContent: {
    flex: 1,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 16,
    flex: 1,
  },
  cardActions: {
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceChip: {
    margin: 4,
  },
  blockchainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  verifiedText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  blockchainLabel: {
    color: '#666',
    fontSize: 14,
    marginBottom: 2,
  },
  blockchainValue: {
    fontSize: 14,
    marginBottom: 12,
  },
  blockchainInfo: {
    fontStyle: 'italic',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 16,
  },
  emergencyButton: {
    backgroundColor: '#e74c3c',
    marginTop: 8,
    marginBottom: 16,
  },
  emergencyButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ambulanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ambulanceItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ambulanceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    marginRight: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200ee',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default HospitalDetailsScreen;