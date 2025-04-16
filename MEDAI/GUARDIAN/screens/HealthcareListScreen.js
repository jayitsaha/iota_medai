import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import {
  Text,
  Appbar,
  Card,
  Title,
  Paragraph,
  Chip,
  Searchbar,
  Button,
  ActivityIndicator,
  Divider,
  IconButton,
  ScrollView,

} from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { fetchHealthcareRecords } from '../services/blockchainService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HealthcareListScreen = ({ navigation, route }) => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState(route.params?.filter || 'all');
  const [userType, setUserType] = useState('');
  const [patientId, setPatientId] = useState(route.params?.patientId || '');

  // Get user type on component mount
  useEffect(() => {
    getUserType();
  }, []);

  // Load records when component mounts
  useEffect(() => {
    loadRecords();
  }, [patientId, userType]);

  // Filter records when records, search query, or filter type changes
  useEffect(() => {
    filterRecords();
  }, [records, searchQuery, filterType]);
  
  // Get user type from AsyncStorage
  const getUserType = async () => {
    try {
      const type = await AsyncStorage.getItem('userType');
      setUserType(type || '');
    } catch (error) {
      console.error('Error getting user type:', error);
    }
  };

  // Load healthcare records from blockchain
  const loadRecords = async () => {
    try {
      setLoading(true);
      
      // Fetch all healthcare records
      let data = await fetchHealthcareRecords();
      
      // Filter records for the specific patient if patientId is provided
      if (patientId) {
        data = data.filter(record => record.patient_id === patientId);
      }
      
      // Sort by timestamp (most recent first)
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setRecords(data);
    } catch (error) {
      console.error('Error fetching healthcare records:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter records based on search query and filter type
  const filterRecords = () => {
    let filtered = [...records];
    
    // Apply record type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(record => record.record_type === filterType);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record => 
        record.record_type?.toLowerCase().includes(query) ||
        record.provider?.toLowerCase().includes(query) ||
        record.date?.toLowerCase().includes(query) ||
        (typeof record.details === 'string' ? 
          record.details.toLowerCase().includes(query) : 
          JSON.stringify(record.details).toLowerCase().includes(query))
      );
    }
    
    setFilteredRecords(filtered);
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

  // Get appropriate icon for the record type
  const getRecordTypeIcon = (type) => {
    switch(type) {
      case 'Prescription':
        return 'pill';
      case 'BloodTest':
        return 'flask';
      case 'Vaccination':
        return 'fitness';
      case 'MedicalReport':
        return 'clipboard';
      default:
        return 'medical-bag';
    }
  };

  // Get status chip with appropriate styling
  const getStatusChip = (status) => {
    const getStyle = () => {
      switch(status) {
        case 'Active':
          return styles.statusActive;
        case 'Completed':
          return styles.statusCompleted;
        case 'Cancelled':
          return styles.statusCancelled;
        default:
          return styles.statusDefault;
      }
    };
    
    return (
      <Chip style={getStyle()} textStyle={styles.statusChipText}>
        {status}
      </Chip>
    );
  };

  // Render record item component
  const renderRecordItem = ({ item }) => {
    // Parse details if it's a JSON string
    let details = {};
    try {
      if (typeof item.details === 'string') {
        details = JSON.parse(item.details);
      } else {
        details = item.details;
      }
    } catch (e) {
      details = { text: item.details };
    }

    // Determine what details to show based on record type
    let detailsToShow = '';
    switch(item.record_type) {
      case 'Prescription':
        detailsToShow = details.medication ? 
          `Medication: ${details.medication}${details.dosage ? ` (${details.dosage})` : ''}` : '';
        break;
      case 'BloodTest':
        detailsToShow = details.test_name ? `Test: ${details.test_name}` : '';
        break;
      case 'Vaccination':
        detailsToShow = details.vaccine ? `Vaccine: ${details.vaccine}` : '';
        break;
      case 'MedicalReport':
        detailsToShow = details.diagnosis ? `Diagnosis: ${details.diagnosis}` : '';
        break;
      default:
        detailsToShow = '';
    }

    return (
      <Card 
        style={styles.recordCard}
        onPress={() => navigation.navigate('ViewHealthcareRecord', { recordId: item.record_id })}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.typeContainer}>
              {item.record_type == 'Prescription'?(<MaterialCommunityIcons 
                name={getRecordTypeIcon(item.record_type)} 
                size={20} 
                color="#4A6FA5" 
                style={styles.typeIcon}
              />):(<Ionicons 
              name={getRecordTypeIcon(item.record_type)} 
              size={20} 
              color="#4A6FA5" 
              style={styles.typeIcon}
            />)}
              <Title style={styles.recordType}>
                {item.record_type}
              </Title>
            </View>
            {getStatusChip(item.status)}
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.recordDetails}>
            <Paragraph style={styles.recordProvider}>Provider: {item.provider}</Paragraph>
            <Paragraph style={styles.recordDate}>Date: {item.date}</Paragraph>
            
            {detailsToShow ? (
              <Paragraph style={styles.recordSpecificDetails}>{detailsToShow}</Paragraph>
            ) : null}
            
            <View style={styles.recordFooter}>
              <Text style={styles.timestamp}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
              <IconButton
                icon="chevron-right"
                size={20}
                color="#94A3B8"
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={patientId ? "Patient Records" : "Healthcare Records"} />
        <Appbar.Action 
          icon="plus" 
          onPress={() => navigation.navigate('AddHealthcareRecord', { patientId })} 
        />
      </Appbar.Header>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search records..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        {/* <View style={styles.filterContainer}>
          <ScrollableFilterChips 
            selectedFilter={filterType} 
            onFilterChange={setFilterType} 
          />
        </View> */}
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A6FA5" />
          <Text style={styles.loadingText}>Loading healthcare records from blockchain...</Text>
        </View>
      ) : filteredRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>
            {searchQuery ? 
              'No records found matching your search' : 
              filterType !== 'all' ? 
                `No ${filterType} records found` : 
                patientId ? 
                  'No healthcare records for this patient' : 
                  'No healthcare records found'
            }
          </Text>
          <Button 
            mode="contained" 
            icon="plus" 
            onPress={() => navigation.navigate('AddHealthcareRecord', { patientId })}
            style={styles.addButton}
          >
            Add New Record
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={renderRecordItem}
          keyExtractor={item => item.record_id || item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4A6FA5']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

// Scrollable filter chips component
const ScrollableFilterChips = ({ selectedFilter, onFilterChange }) => {
  const filters = [
    { id: 'all', label: 'All Records' },
    { id: 'Prescription', label: 'Medications' },
    { id: 'BloodTest', label: 'Lab Tests' },
    { id: 'Vaccination', label: 'Vaccinations' },
    { id: 'MedicalReport', label: 'Reports' }
  ];
  
  return (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtersScrollContainer}
    >
      {filters.map(filter => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterChip,
            selectedFilter === filter.id && styles.filterChipActive
          ]}
          onPress={() => onFilterChange(filter.id)}
        >
          <Text style={[
            styles.filterChipText,
            selectedFilter === filter.id && styles.filterChipTextActive
          ]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#F1F5F9',
  },
  filterContainer: {
    marginTop: 12,
  },
  filtersScrollContainer: {
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#4A6FA5',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 16,
    backgroundColor: '#4A6FA5',
  },
  listContent: {
    padding: 16,
  },
  recordCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    marginRight: 8,
  },
  recordType: {
    flex: 1,
    fontSize: 16,
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusCompleted: {
    backgroundColor: '#E3F2FD',
  },
  statusCancelled: {
    backgroundColor: '#FFEBEE',
  },
  statusDefault: {
    backgroundColor: '#F1F5F9',
  },
  statusChipText: {
    fontSize: 12,
  },
  divider: {
    marginBottom: 8,
  },
  recordDetails: {
    paddingVertical: 4,
  },
  recordProvider: {
    fontSize: 14,
    color: '#334155',
  },
  recordDate: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  recordSpecificDetails: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  recordFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});

export default HealthcareListScreen;