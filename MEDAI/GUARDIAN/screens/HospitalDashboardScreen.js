import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { CONFIG } from '../config';
import { fetchOrganRecords } from '../services/apiService';

const API_URL = CONFIG?.API_URL || 'http://localhost:3000/api';

const HospitalDashboardScreen = ({ navigation }) => {
  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ambulances, setAmbulances] = useState([]);
  const [stats, setStats] = useState({
    emergencyCapacity: 0,
    availableCapacity: 0,
    ambulanceCount: 0,
    availableAmbulances: 0,
    organDonorCount: 0
  });

  const API_BASE_URL = 'http://192.168.71.82:5001';
  
  const getHopsitalID = async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/get-hospital-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Prescription verification API error:', error);
      return { verified: false, error: error.message };
    }
  };

  // Load hospital data from storage or fetch from API
  const loadHospitalData = async () => {

    console.log("GETTING HOSPITAL EMAIL")
    const hosp_email = await AsyncStorage.getItem('authToken');
    console.log(hosp_email)

    const hospital_id = await getHopsitalID(hosp_email);

    console.log("GETTING HOSPITAL ID FROM API")
    console.log(hospital_id.hospital_id)
    
          
          // Fetch ambulances for this hospital
    fetchAmbulances(hospital_id.hospital_id);
    
    // Fetch hospital stats
    fetchHospitalStats(hospital_id.hospital_id);

    setLoading(false)
       
      };
  // Fetch ambulances for this hospital
  const fetchAmbulances = async (hospitalId) => {
    try {
      const response = await axios.get(`${API_URL}/hospitals/${hospitalId}/ambulances`);
      setAmbulances(response.data);
      
      // Update stats
      setStats(prevStats => ({
        ...prevStats,
        ambulanceCount: response.data.length,
        availableAmbulances: response.data.filter(amb => amb.current_status === 'Available').length
      }));
    } catch (error) {
      console.error('Error fetching ambulances:', error);
      // Set empty array on error
      setAmbulances([]);
    }
  };

  // Fetch hospital statistics
  const fetchHospitalStats = async (hospitalId) => {
    try {
      // Fetch organ donor records
      const organRecords = await fetchOrganRecords();
      
      // Filter records for this hospital
      const hospitalOrganRecords = organRecords
      // Update stats with organ donor count
      setStats(prevStats => ({
        ...prevStats,
        organDonorCount: hospitalOrganRecords.length
      }));
      
      // Fetch emergency capacity stats from API
      const response = await axios.get(`${API_URL}/hospitals/${hospitalId}`);
      
      if (response.data) {
        setStats(prevStats => ({
          ...prevStats,
          emergencyCapacity: response.data.emergency_capacity || 0,
          availableCapacity: response.data.available_capacity || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching hospital stats:', error);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadHospitalData();
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          onPress: async () => {
            // Clear auth data
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userType');
            await AsyncStorage.removeItem('hospitalData');
            
            // Navigate to login
            navigation.reset({
              index: 0,
              routes: [{ name: 'HospitalLogin' }],
            });
          }
        }
      ]
    );
  };

  // Load data on component mount
  useEffect(() => {
    loadHospitalData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A6FA5" />
        <Text style={styles.loadingText}>Loading hospital dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A6FA5" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {hospital?.logo ? (
            <Image source={{ uri: hospital.logo }} style={styles.hospitalLogo} />
          ) : (
            <View style={styles.hospitalLogoPlaceholder}>
              <Text style={styles.hospitalLogoText}>
                {hospital?.name ? hospital.name.charAt(0) : 'H'}
              </Text>
            </View>
          )}
          
          <View style={styles.hospitalInfo}>
            <Text style={styles.hospitalName}>{hospital?.name || 'Hospital Dashboard'}</Text>
            {hospital?.location?.city && hospital?.location?.state && (
              <Text style={styles.hospitalLocation}>
                {hospital.location.city}, {hospital.location.state}
              </Text>
            )}
          </View>
          
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A6FA5']}
            tintColor="#4A6FA5"
          />
        }
      >
        {/* Hospital Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.emergencyBedIcon]}>
              <Ionicons name="bed-outline" size={24} color="#4A6FA5" />
            </View>
            <Text style={styles.statValue}>{stats.emergencyCapacity}</Text>
            <Text style={styles.statLabel}>Emergency Beds</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.ambulanceIcon]}>
              <Ionicons name="car-outline" size={24} color="#2A9D8F" />
            </View>
            <View style={styles.statValueContainer}>
              <Text style={styles.statValue}>{stats.availableAmbulances}</Text>
              <Text style={styles.statTotal}>/{stats.ambulanceCount}</Text>
            </View>
            <Text style={styles.statLabel}>Ambulances</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.organDonorIcon]}>
              <Ionicons name="heart-outline" size={24} color="#E57373" />
            </View>
            <Text style={styles.statValue}>{stats.organDonorCount}</Text>
            <Text style={styles.statLabel}>Organ Donors</Text>
          </View>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('OrganDonorRegistry')}
            >
              <View style={[styles.actionIconContainer, styles.organDonorAction]}>
                <Ionicons name="heart" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Organ Donor Registry</Text>
              <Text style={styles.actionDescription}>Register and manage organ donors</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('AmbulanceManagement')}
            >
              <View style={[styles.actionIconContainer, styles.ambulanceAction]}>
                <Ionicons name="car" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Ambulance Service</Text>
              <Text style={styles.actionDescription}>Manage ambulance fleet and status</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('EmergencyReport')}
            >
              <View style={[styles.actionIconContainer, styles.emergencyAction]}>
                <Ionicons name="alert-circle" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Emergency Service</Text>
              <Text style={styles.actionDescription}>Handle emergency requests</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('HospitalSettings')}
            >
              <View style={[styles.actionIconContainer, styles.settingsAction]}>
                <Ionicons name="settings" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Hospital Settings</Text>
              <Text style={styles.actionDescription}>Update hospital information</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Ambulance Status */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ambulance Fleet Status</Text>
            <TouchableOpacity 
              style={styles.sectionAction}
              onPress={() => navigation.navigate('AmbulanceManagement')}
            >
              <Text style={styles.sectionActionText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#4A6FA5" />
            </TouchableOpacity>
          </View>
          
          {ambulances.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="car-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No ambulances registered</Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('AmbulanceManagement')}
              >
                <Text style={styles.emptyStateButtonText}>Add Ambulance</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.ambulancesContainer}>
              {ambulances.slice(0, 3).map((ambulance) => (
                <View key={ambulance.id} style={styles.ambulanceItem}>
                  <View style={styles.ambulanceHeader}>
                    <Text style={styles.ambulanceId}>{ambulance.registration_number}</Text>
                    <View style={[
                      styles.statusBadge,
                      ambulance.current_status === 'Available' ? styles.statusAvailable :
                      ambulance.current_status === 'Dispatched' ? styles.statusDispatched :
                      styles.statusMaintenance
                    ]}>
                      <Text style={styles.statusText}>{ambulance.current_status}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.ambulanceDetails}>
                    <View style={styles.ambulanceDetailItem}>
                      <Ionicons name="options-outline" size={16} color="#64748B" />
                      <Text style={styles.ambulanceDetailText}>{ambulance.vehicle_type}</Text>
                    </View>
                    
                    <View style={styles.ambulanceDetailItem}>
                      <Ionicons name="people-outline" size={16} color="#64748B" />
                      <Text style={styles.ambulanceDetailText}>Capacity: {ambulance.capacity}</Text>
                    </View>
                    
                    {ambulance.current_location && (
                      <View style={styles.ambulanceDetailItem}>
                        <Ionicons name="location-outline" size={16} color="#64748B" />
                        <Text style={styles.ambulanceDetailText}>
                          {ambulance.current_location.latitude.toFixed(4)}, 
                          {ambulance.current_location.longitude.toFixed(4)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
              
              {ambulances.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => navigation.navigate('AmbulanceManagement')}
                >
                  <Text style={styles.viewAllButtonText}>
                    View All {ambulances.length} Ambulances
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        {/* Recent Activities */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Activities</Text>
          
          <View style={styles.activitiesContainer}>
            <View style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <Ionicons name="heart" size={20} color="#E57373" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  <Text style={styles.activityHighlight}>New organ donor</Text> registered
                </Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
            
            <View style={styles.activityItem}>
              <View style={[styles.activityIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="car" size={20} color="#4A6FA5" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  Ambulance <Text style={styles.activityHighlight}>KA-01-AB-1234</Text> dispatched
                </Text>
                <Text style={styles.activityTime}>3 hours ago</Text>
              </View>
            </View>
            
            <View style={styles.activityItem}>
              <View style={[styles.activityIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="fitness" size={20} color="#2A9D8F" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  Emergency capacity updated to <Text style={styles.activityHighlight}>{stats.emergencyCapacity}</Text>
                </Text>
                <Text style={styles.activityTime}>1 day ago</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  header: {
    backgroundColor: '#4A6FA5',
    paddingTop: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  hospitalLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  hospitalLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hospitalLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  hospitalLocation: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyBedIcon: {
    backgroundColor: '#E3F2FD',
  },
  ambulanceIcon: {
    backgroundColor: '#E8F5E9',
  },
  organDonorIcon: {
    backgroundColor: '#FFEBEE',
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  statTotal: {
    fontSize: 14,
    color: '#64748B',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    fontSize: 14,
    color: '#4A6FA5',
    marginRight: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  organDonorAction: {
    backgroundColor: '#E57373',
  },
  ambulanceAction: {
    backgroundColor: '#2A9D8F',
  },
  emergencyAction: {
    backgroundColor: '#F9A826',
  },
  settingsAction: {
    backgroundColor: '#4A6FA5',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 16,
  },
  emptyStateButton: {
    backgroundColor: '#4A6FA5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  ambulancesContainer: {
    marginTop: 8,
  },
  ambulanceItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
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
  statusAvailable: {
    backgroundColor: '#E8F5E9',
  },
  statusDispatched: {
    backgroundColor: '#FFF8E1',
  },
  statusMaintenance: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  ambulanceDetails: {
    marginLeft: 8,
  },
  ambulanceDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ambulanceDetailText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
  },
  viewAllButton: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4A6FA5',
  },
  activitiesContainer: {
    marginTop: 8,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
    justifyContent: 'center',
  },
  activityText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
  },
  activityHighlight: {
    fontWeight: '600',
    color: '#0F172A',
  },
  activityTime: {
    fontSize: 12,
    color: '#64748B',
  },
});

export default HospitalDashboardScreen;