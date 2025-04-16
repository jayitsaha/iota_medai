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

const HealthcareProviderDashboardScreen = ({ navigation }) => {
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activeRecords: 0,
    pendingRecords: 0,
    completedRecords: 0
  });

  // Load provider data from storage or fetch from API
  const loadProviderData = async () => {
    try {
      const providerData = await AsyncStorage.getItem('providerData');
      if (providerData) {
        setProvider(JSON.parse(providerData));
      }
      
      // Fetch provider statistics and recent patients
      fetchProviderStats();
      fetchRecentPatients();
      
    } catch (error) {
      console.error('Error loading provider data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch provider statistics
  const fetchProviderStats = async () => {
    try {
      // In a real app, this would be fetched from an API
      // Using mock data for demonstration
      setStats({
        totalPatients: 32,
        activeRecords: 25,
        pendingRecords: 8,
        completedRecords: 42
      });
    } catch (error) {
      console.error('Error fetching provider stats:', error);
    }
  };

  // Fetch recent patients for this provider
  const fetchRecentPatients = async () => {
    try {
      // In a real app, this would be fetched from an API
      // Using mock data for demonstration
      setPatients([
        {
          id: '1',
          name: 'Mohan Patel',
          age: 72,
          lastRecord: 'Blood Test',
          lastVisit: '2 days ago',
          status: 'Active'
        },
        {
          id: '2',
          name: 'Priya Sharma',
          age: 45,
          lastRecord: 'Vaccination',
          lastVisit: '1 week ago',
          status: 'Active'
        },
        {
          id: '3',
          name: 'Arun Kumar',
          age: 58,
          lastRecord: 'Prescription',
          lastVisit: '3 days ago',
          status: 'Pending'
        },
        {
          id: '4',
          name: 'Neha Singh',
          age: 32,
          lastRecord: 'Medical Report',
          lastVisit: 'Today',
          status: 'Active'
        }
      ]);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadProviderData();
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
            await AsyncStorage.removeItem('providerData');
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
    loadProviderData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A6FA5" />
        <Text style={styles.loadingText}>Loading provider dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A6FA5" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {provider?.logo ? (
            <Image source={{ uri: provider.logo }} style={styles.providerLogo} />
          ) : (
            <View style={styles.providerLogoPlaceholder}>
              <Text style={styles.providerLogoText}>
                {provider?.name ? provider.name.charAt(0) : 'H'}
              </Text>
            </View>
          )}
          
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider?.name || 'Healthcare Provider'}</Text>
            {provider?.specialization && (
              <Text style={styles.providerSpecialization}>
                {provider.specialization}
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
        {/* Provider Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.patientsIcon]}>
              <Ionicons name="people-outline" size={24} color="#4A6FA5" />
            </View>
            <Text style={styles.statValue}>{stats.totalPatients}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.activeIcon]}>
              <Ionicons name="document-text-outline" size={24} color="#2A9D8F" />
            </View>
            <Text style={styles.statValue}>{stats.activeRecords}</Text>
            <Text style={styles.statLabel}>Active Records</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.pendingIcon]}>
              <Ionicons name="time-outline" size={24} color="#F9A826" />
            </View>
            <Text style={styles.statValue}>{stats.pendingRecords}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, styles.completedIcon]}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#81B29A" />
            </View>
            <Text style={styles.statValue}>{stats.completedRecords}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
        
        {/* Quick Actions */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('AddHealthcareRecordScreen')}
            >
              <View style={[styles.actionIconContainer, styles.addRecordAction]}>
                <Ionicons name="add-circle" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Add Record</Text>
              <Text style={styles.actionDescription}>Create new healthcare record</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('HealthcareListScreen')}
            >
              <View style={[styles.actionIconContainer, styles.viewRecordsAction]}>
                <Ionicons name="list" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>View Records</Text>
              <Text style={styles.actionDescription}>Manage healthcare records</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('PatientList')}
            >
              <View style={[styles.actionIconContainer, styles.patientsAction]}>
                <Ionicons name="people" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Patients</Text>
              <Text style={styles.actionDescription}>View and manage patients</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => navigation.navigate('ProviderSettings')}
            >
              <View style={[styles.actionIconContainer, styles.settingsAction]}>
                <Ionicons name="settings" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionDescription}>Update provider information</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Recent Patients */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Patients</Text>
            <TouchableOpacity 
              style={styles.sectionAction}
              onPress={() => navigation.navigate('PatientList')}
            >
              <Text style={styles.sectionActionText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#4A6FA5" />
            </TouchableOpacity>
          </View>
          
          {patients.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No patients available</Text>
            </View>
          ) : (
            <View style={styles.patientsContainer}>
              {patients.map((patient) => (
                <TouchableOpacity 
                  key={patient.id} 
                  style={styles.patientItem}
                  onPress={() => navigation.navigate('PatientDashboard', { 
                    patientId: patient.id,
                    patientName: patient.name
                  })}
                >
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patient.name}</Text>
                    <Text style={styles.patientDetails}>{patient.age} years • Last visit: {patient.lastVisit}</Text>
                    <Text style={styles.patientRecord}>Last record: {patient.lastRecord}</Text>
                  </View>
                  
                  <View style={styles.patientActions}>
                    <View style={[
                      styles.statusBadge,
                      patient.status === 'Active' ? styles.statusActive :
                      patient.status === 'Pending' ? styles.statusPending :
                      styles.statusCompleted
                    ]}>
                      <Text style={styles.statusText}>{patient.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
                  </View>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('PatientList')}
              >
                <Text style={styles.viewAllButtonText}>
                  View All {stats.totalPatients} Patients
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Record Types Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Record Types</Text>
          
          <View style={styles.recordTypesContainer}>
            <TouchableOpacity 
              style={styles.recordTypeCard}
              onPress={() => navigation.navigate('HealthcareList', { filter: 'Prescription' })}
            >
              <View style={[styles.recordTypeIcon, styles.prescriptionIcon]}>
                <Ionicons name="document-text" size={24} color="#4A6FA5" />
              </View>
              <Text style={styles.recordTypeName}>Prescriptions</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.recordTypeCard}
              onPress={() => navigation.navigate('HealthcareList', { filter: 'BloodTest' })}
            >
              <View style={[styles.recordTypeIcon, styles.labTestIcon]}>
                <Ionicons name="flask" size={24} color="#F9A826" />
              </View>
              <Text style={styles.recordTypeName}>Lab Tests</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.recordTypeCard}
              onPress={() => navigation.navigate('HealthcareList', { filter: 'Vaccination' })}
            >
              <View style={[styles.recordTypeIcon, styles.vaccinationIcon]}>
                <Ionicons name="fitness" size={24} color="#2A9D8F" />
              </View>
              <Text style={styles.recordTypeName}>Vaccinations</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.recordTypeCard}
              onPress={() => navigation.navigate('HealthcareList', { filter: 'MedicalReport' })}
            >
              <View style={[styles.recordTypeIcon, styles.reportIcon]}>
                <Ionicons name="clipboard" size={24} color="#E57373" />
              </View>
              <Text style={styles.recordTypeName}>Medical Reports</Text>
            </TouchableOpacity>
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
  providerLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  providerLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  providerLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  providerSpecialization: {
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
  patientsIcon: {
    backgroundColor: '#E3F2FD',
  },
  activeIcon: {
    backgroundColor: '#E8F5E9',
  },
  pendingIcon: {
    backgroundColor: '#FFF8E1',
  },
  completedIcon: {
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
  addRecordAction: {
    backgroundColor: '#4A6FA5',
  },
  viewRecordsAction: {
    backgroundColor: '#2A9D8F',
  },
  patientsAction: {
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
  patientsContainer: {
    marginTop: 8,
  },
  patientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  patientDetails: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  patientRecord: {
    fontSize: 14,
    color: '#64748B',
  },
  patientActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF8E1',
  },
  statusCompleted: {
    backgroundColor: '#E3F2FD',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
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
  recordTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  recordTypeCard: {
    width: '48%',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  prescriptionIcon: {
    backgroundColor: '#E3F2FD',
  },
  labTestIcon: {
    backgroundColor: '#FFF8E1',
  },
  vaccinationIcon: {
    backgroundColor: '#E8F5E9',
  },
  reportIcon: {
    backgroundColor: '#FFEBEE',
  },
  recordTypeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
});

export default HealthcareProviderDashboardScreen;