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

const API_URL = CONFIG?.API_URL || 'http://localhost:3000/api';

const PharmacyDashboardScreen = ({ navigation }) => {
  const [pharmacy, setPharmacy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [stats, setStats] = useState({
    totalMedicines: 0,
    activeMedicines: 0,
    pendingVerifications: 0,
    inventory: 0
  });

  // Load pharmacy data from storage or fetch from API
  const loadPharmacyData = async () => {
    try {
      const pharmacyData = await AsyncStorage.getItem('pharmacyData');
      if (pharmacyData) {
        setPharmacy(JSON.parse(pharmacyData));
      }
      
      // Fetch pharmacy stats and medicines
      fetchPharmacyStats();
      fetchMedicines();
      
    } catch (error) {
      console.error('Error loading pharmacy data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pharmacy statistics
  const fetchPharmacyStats = async () => {
    try {
      // In a real app, this would be fetched from an API
      // Using mock data for demonstration
      setStats({
        totalMedicines: 48,
        activeMedicines: 32,
        pendingVerifications: 5,
        inventory: 85
      });
    } catch (error) {
      console.error('Error fetching pharmacy stats:', error);
    }
  };

  // Fetch medicines for this pharmacy
  const fetchMedicines = async () => {
    try {
      const response = await axios.get(`${API_URL}/medicines`);
      
      // Filter and map for display purposes
      const recentMedicines = response.data.slice(0, 5).map(med => ({
        id: med.id || Math.random().toString(),
        serialNumber: med.serial_number,
        name: med.name,
        manufacturer: med.manufacturer,
        status: med.status,
        expirationDate: med.expiration_date
      }));
      
      setMedicines(recentMedicines);
    } catch (error) {
      console.error('Error fetching medicines:', error);
      setMedicines([]);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPharmacyData();
    setRefreshing(false);
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userType');
            await AsyncStorage.removeItem('pharmacyData');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  // Load data on component mount
  useEffect(() => {
    loadPharmacyData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A6FA5" />
        <Text style={styles.loadingText}>Loading pharmacy dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A6FA5" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {pharmacy?.logo ? (
            <Image source={{ uri: pharmacy.logo }} style={styles.pharmacyLogo} />
          ) : (
            <View style={styles.pharmacyLogoPlaceholder}>
              <Text style={styles.pharmacyLogoText}>
                {pharmacy?.name ? pharmacy.name.charAt(0) : 'P'}
              </Text>
            </View>
          )}
          
          <View style={styles.pharmacyInfo}>
            <Text style={styles.pharmacyName}>{pharmacy?.name || 'Pharmacy Dashboard'}</Text>
            {pharmacy?.location && (
              <Text style={styles.pharmacyLocation}>
                {pharmacy.location}
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
        {/* Pharmacy Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.medicineIcon]}>
              <Ionicons name="medkit-outline" size={24} color="#4A6FA5" />
            </View>
            <Text style={styles.statValue}>{stats.totalMedicines}</Text>
            <Text style={styles.statLabel}>Total Medicines</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.verifiedIcon]}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#2A9D8F" />
            </View>
            <Text style={styles.statValue}>{stats.activeMedicines}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.pendingIcon]}>
              <Ionicons name="time-outline" size={24} color="#F9A826" />
            </View>
            <Text style={styles.statValue}>{stats.pendingVerifications}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.inventoryIcon]}>
              <Ionicons name="cube-outline" size={24} color="#E57373" />
            </View>
            <Text style={styles.statValue}>{stats.inventory}%</Text>
            <Text style={styles.statLabel}>Inventory</Text>
          </View>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('RegisterMedicineScreen')}
            >
              <View style={[styles.actionIconContainer, styles.registerMedicineAction]}>
                <Ionicons name="add-circle" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Register Medicine</Text>
              <Text style={styles.actionDescription}>Add new medicine to blockchain</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('VerifyMedicineScreen')}
            >
              <View style={[styles.actionIconContainer, styles.verifyMedicineAction]}>
                <Ionicons name="shield-checkmark" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Verify Medicine</Text>
              <Text style={styles.actionDescription}>Authenticate medicine on blockchain</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('MedicineListScreen')}
            >
              <View style={[styles.actionIconContainer, styles.inventoryAction]}>
                <Ionicons name="list" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Medicine List</Text>
              <Text style={styles.actionDescription}>View all registered medicines</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('PharmacySettings')}
            >
              <View style={[styles.actionIconContainer, styles.settingsAction]}>
                <Ionicons name="settings" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Pharmacy Settings</Text>
              <Text style={styles.actionDescription}>Update pharmacy information</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Recent Medicines */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently Registered Medicines</Text>
            <TouchableOpacity 
              style={styles.sectionAction}
              onPress={() => navigation.navigate('MedicineList')}
            >
              <Text style={styles.sectionActionText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#4A6FA5" />
            </TouchableOpacity>
          </View>
          
          {medicines.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="medical-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No medicines registered yet</Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('RegisterMedicine')}
              >
                <Text style={styles.emptyStateButtonText}>Register Medicine</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.medicinesContainer}>
              {medicines.map((medicine) => (
                <View key={medicine.id} style={styles.medicineItem}>
                  <View style={styles.medicineHeader}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <View style={[
                      styles.statusBadge,
                      medicine.status === 'unactivated' ? styles.statusUnactivated :
                      medicine.status === 'activated' ? styles.statusActivated :
                      styles.statusRecalled
                    ]}>
                      <Text style={styles.statusText}>
                        {medicine.status.charAt(0).toUpperCase() + medicine.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.medicineDetails}>
                    <View style={styles.medicineDetailItem}>
                      <Ionicons name="barcode-outline" size={16} color="#64748B" />
                      <Text style={styles.medicineDetailText}>{medicine.serialNumber}</Text>
                    </View>
                    
                    <View style={styles.medicineDetailItem}>
                      <Ionicons name="business-outline" size={16} color="#64748B" />
                      <Text style={styles.medicineDetailText}>{medicine.manufacturer}</Text>
                    </View>
                    
                    <View style={styles.medicineDetailItem}>
                      <Ionicons name="calendar-outline" size={16} color="#64748B" />
                      <Text style={styles.medicineDetailText}>Expires: {medicine.expirationDate}</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={() => navigation.navigate('VerifyMedicine', { serialNumber: medicine.serialNumber })}
                  >
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
        
        {/* Recent Activity */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          <View style={styles.activitiesContainer}>
            <View style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <Ionicons name="add-circle" size={20} color="#4A6FA5" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  New medicine <Text style={styles.activityHighlight}>Azithromycin 500mg</Text> registered
                </Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
            
            <View style={styles.activityItem}>
              <View style={[styles.activityIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#2A9D8F" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  Medicine <Text style={styles.activityHighlight}>SN-12345-ABC</Text> verified
                </Text>
                <Text style={styles.activityTime}>5 hours ago</Text>
              </View>
            </View>
            
            <View style={styles.activityItem}>
              <View style={[styles.activityIconContainer, { backgroundColor: '#FFEBEE' }]}>
                <Ionicons name="alert-circle" size={20} color="#E57373" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  <Text style={styles.activityHighlight}>Amoxicillin Batch B-23456</Text> recalled
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
  pharmacyLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  pharmacyLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pharmacyLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  pharmacyLocation: {
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
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statCard: {
    alignItems: 'center',
    width: '22%',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineIcon: {
    backgroundColor: '#E3F2FD',
  },
  verifiedIcon: {
    backgroundColor: '#E8F5E9',
  },
  pendingIcon: {
    backgroundColor: '#FFF8E1',
  },
  inventoryIcon: {
    backgroundColor: '#FFEBEE',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
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
  registerMedicineAction: {
    backgroundColor: '#4A6FA5',
  },
  verifyMedicineAction: {
    backgroundColor: '#2A9D8F',
  },
  inventoryAction: {
    backgroundColor: '#F9A826',
  },
  settingsAction: {
    backgroundColor: '#64748B',
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
  medicinesContainer: {
    marginTop: 8,
  },
  medicineItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  medicineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusUnactivated: {
    backgroundColor: '#E3F2FD',
  },
  statusActivated: {
    backgroundColor: '#E8F5E9',
  },
  statusRecalled: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  medicineDetails: {
    marginLeft: 8,
    marginBottom: 12,
  },
  medicineDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicineDetailText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
  },
  verifyButton: {
    backgroundColor: '#4A6FA5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
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
    backgroundColor: '#E3F2FD',
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

export default PharmacyDashboardScreen;