import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import {
  Searchbar,
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  ActivityIndicator,
  Divider,
  Surface
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG.API_URL || 'http://localhost:3000/api';

const HospitalListScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [filteredHospitals, setFilteredHospitals] = useState([]);
  const [search, setSearch] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  
  // Available filters
  const filters = [
    { id: 'all', label: 'All Hospitals' },
    { id: 'emergency', label: 'Emergency Care' },
    { id: 'nearby', label: 'Nearby' },
    { id: 'verified', label: 'Blockchain Verified' }
  ];
  
  // Fetch hospitals on component mount
  useEffect(() => {
    fetchHospitals();
    getCurrentLocation();
  }, []);
  
  // Apply filters and search when dependencies change
  useEffect(() => {
    applyFilters();
  }, [hospitals, search, selectedFilter, currentLocation]);
  
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
  
  // Fetch all hospitals
  const fetchHospitals = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/hospitals`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch hospitals');
      }
      
      const data = await response.json();
      
      // Calculate distances if location is available
      let hospitalsWithDistance = data;
      
      if (currentLocation) {
        hospitalsWithDistance = data.map(hospital => {
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            hospital.location.latitude,
            hospital.location.longitude
          );
          
          return {
            ...hospital,
            distance
          };
        });
      }
      
      setHospitals(hospitalsWithDistance);
      setFilteredHospitals(hospitalsWithDistance);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
      Alert.alert('Error', 'Failed to fetch hospitals');
    } finally {
      setLoading(false);
    }
  };
  
  // Refresh hospitals
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchHospitals();
    setRefreshing(false);
  };
  
  // Apply filters and search
  const applyFilters = () => {
    let result = [...hospitals];
    
    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(hospital => 
        hospital.name.toLowerCase().includes(searchLower) ||
        hospital.location.city.toLowerCase().includes(searchLower) ||
        hospital.location.address.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply filter
    switch (selectedFilter) {
      case 'emergency':
        result = result.filter(hospital => hospital.emergency_capacity > 0);
        break;
      case 'nearby':
        if (currentLocation) {
          // Sort by distance
          result.sort((a, b) => {
            const distanceA = a.distance !== undefined ? a.distance : 
              calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                a.location.latitude,
                a.location.longitude
              );
            
            const distanceB = b.distance !== undefined ? b.distance : 
              calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                b.location.latitude,
                b.location.longitude
              );
            
            return distanceA - distanceB;
          });
          
          // Limit to 10 nearest hospitals
          result = result.slice(0, 10);
        }
        break;
      case 'verified':
        result = result.filter(hospital => 
          hospital.blockchainStatus === 'Confirmed' ||
          hospital.blockchainTransactionId
        );
        break;
      default:
        // 'all' - no additional filtering
        break;
    }
    
    setFilteredHospitals(result);
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
    if (distance === undefined) return '';
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    } else {
      return `${distance.toFixed(1)} km`;
    }
  };
  
  // Render hospital item
  const renderHospitalItem = ({ item }) => (
    <Card
      style={styles.hospitalCard}
      onPress={() => navigation.navigate('HospitalDetails', { hospitalId: item.id })}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title style={styles.hospitalName}>{item.name}</Title>
          {item.blockchainTransactionId && (
            <MaterialIcons name="verified" size={20} color="#4caf50" />
          )}
        </View>
        
        <Paragraph style={styles.hospitalAddress}>
          {item.location.address}, {item.location.city}, {item.location.state}
        </Paragraph>
        
        <View style={styles.tagsContainer}>
          {item.emergency_capacity > 0 && (
            <Chip
              style={[styles.tag, styles.emergencyTag]}
              textStyle={styles.tagText}
              mode="flat"
              icon="hospital"
            >
              Emergency ({item.emergency_capacity})
            </Chip>
          )}
          
          {item.services && item.services.length > 0 && (
            <Chip
              style={styles.tag}
              textStyle={styles.tagText}
              mode="outlined"
            >
              {item.services.length} Services
            </Chip>
          )}
          
          {item.distance !== undefined && (
            <Chip
              style={styles.tag}
              textStyle={styles.tagText}
              mode="outlined"
              icon="map-marker-distance"
            >
              {formatDistance(item.distance)}
            </Chip>
          )}
        </View>
      </Card.Content>
      
      <Card.Actions style={styles.cardActions}>
        <Button
          mode="text"
          icon="information"
          onPress={() => navigation.navigate('HospitalDetails', { hospitalId: item.id })}
        >
          Details
        </Button>
        
        <Button
          mode="text"
          icon="ambulance"
          onPress={() => navigation.navigate('HospitalDetails', { hospitalId: item.id, initialTab: 'ambulances' })}
        >
          Ambulances
        </Button>
      </Card.Actions>
    </Card>
  );
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="local-hospital" size={64} color="#cecece" />
      <Text style={styles.emptyText}>No hospitals found</Text>
      <Text style={styles.emptySubtext}>
        {search 
          ? 'Try a different search term or clear the filter'
          : 'Add hospitals to the registry to get started'
        }
      </Text>
      
      <Button
        mode="contained"
        onPress={() => navigation.navigate('RegisterHospital')}
        style={styles.emptyButton}
      >
        Register New Hospital
      </Button>
    </View>
  );
  
  return (
    <View style={styles.container}>
      <Surface style={styles.searchContainer}>
        <Searchbar
          placeholder="Search hospitals..."
          onChangeText={setSearch}
          value={search}
          style={styles.searchBar}
        />
      </Surface>
      
      <View style={styles.filterContainer}>
        <ScrollHorizontal>
          {filters.map((filter) => (
            <Chip
              key={filter.id}
              selected={selectedFilter === filter.id}
              onPress={() => setSelectedFilter(filter.id)}
              style={styles.filterChip}
              mode={selectedFilter === filter.id ? "flat" : "outlined"}
            >
              {filter.label}
            </Chip>
          ))}
        </ScrollHorizontal>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading hospitals...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={filteredHospitals}
            keyExtractor={(item) => item.id}
            renderItem={renderHospitalItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#6200ee"]}
              />
            }
          />
          
          <Surface style={styles.actionButtonContainer}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => navigation.navigate('RegisterHospital')}
              style={styles.actionButton}
            >
              Register Hospital
            </Button>
          </Surface>
        </>
      )}
    </View>
  );
};

// Horizontal scrolling component for filters
const ScrollHorizontal = ({ children }) => (
  <View style={{ flexDirection: 'row' }}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 8 }}
    >
      {children}
    </ScrollView>
  </View>
);

// Avoid requiring ScrollView at the top level
const ScrollView = ({ children, ...props }) => {
  const [contentWidth, setContentWidth] = useState(0);
  
  return (
    <View
      style={{ flexDirection: 'row' }}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        setContentWidth(width);
      }}
    >
      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => <View>{children}</View>}
        {...props}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    elevation: 4,
    backgroundColor: '#6200ee',
  },
  searchBar: {
    elevation: 0,
  },
  filterContainer: {
    paddingVertical: 8,
    backgroundColor: 'white',
    elevation: 2,
  },
  filterChip: {
    margin: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Space for action button
  },
  hospitalCard: {
    marginBottom: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hospitalName: {
    flex: 1,
    fontSize: 18,
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    marginRight: 8,
    marginBottom: 8,
  },
  emergencyTag: {
    backgroundColor: '#e3f2fd',
  },
  tagText: {
    fontSize: 12,
  },
  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  actionButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    elevation: 8,
  },
  actionButton: {
    borderRadius: 4,
  },
});

export default HospitalListScreen;