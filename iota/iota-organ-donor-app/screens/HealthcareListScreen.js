import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, ActivityIndicator, Text, Button, Chip, Searchbar } from 'react-native-paper';
import { fetchHealthcareRecords } from '../services/healthcareService';

export default function HealthcareListScreen({ navigation, route }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRecords, setFilteredRecords] = useState([]);

  // Get the filter type from route params (if available)
  const filterType = route.params?.filter;

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchHealthcareRecords();
      
      // Apply filter if specified
      const filteredData = filterType 
        ? data.filter(record => record.record_type === filterType)
        : data;
        
      setRecords(filteredData);
      setFilteredRecords(filteredData);
    } catch (err) {
      console.error('Error fetching healthcare records:', err);
      setError('Failed to load healthcare records. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [filterType]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRecords(records);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = records.filter(record => 
        record.record_type.toLowerCase().includes(lowercaseQuery) ||
        record.provider.toLowerCase().includes(lowercaseQuery) ||
        record.date.toLowerCase().includes(lowercaseQuery)
      );
      setFilteredRecords(filtered);
    }
  }, [searchQuery, records]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRecords();
  };

  const getRecordTypeIcon = (type) => {
    switch(type) {
      case 'Prescription':
        return 'pill';
      case 'BloodTest':
        return 'test-tube';
      case 'Vaccination':
        return 'needle';
      case 'MedicalReport':
        return 'file-document';
      default:
        return 'medical-bag';
    }
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'Active':
        return <Chip style={styles.activeChip}>Active</Chip>;
      case 'Completed':
        return <Chip style={styles.completedChip}>Completed</Chip>;
      case 'Cancelled':
        return <Chip style={styles.cancelledChip}>Cancelled</Chip>;
      default:
        return <Chip>{status}</Chip>;
    }
  };

  const renderItem = ({ item }) => {
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

    return (
      <Card 
        style={styles.card} 
        onPress={() => navigation.navigate('ViewHealthcareRecord', { 
          recordId: item.record_id 
        })}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.recordType}>
              {item.record_type}
            </Title>
            {getStatusChip(item.status)}
          </View>
          
          <Paragraph>Provider: {item.provider}</Paragraph>
          <Paragraph>Date: {item.date}</Paragraph>
          
          {/* Display relevant details based on record type */}
          {item.record_type === 'Prescription' && (
            <Paragraph>
              Medication: {details.medication || 'N/A'} 
              {details.dosage ? ` (${details.dosage})` : ''}
            </Paragraph>
          )}
          
          {item.record_type === 'BloodTest' && (
            <Paragraph>
              Test: {details.test_name || 'Blood Analysis'}
            </Paragraph>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading healthcare records from IOTA...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search records"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {filteredRecords.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noRecordsText}>
            {error ? error : searchQuery 
              ? 'No matching records found' 
              : filterType 
                ? `No ${filterType} records found` 
                : 'No healthcare records found'}
          </Text>
          <Button 
            mode="contained" 
            onPress={loadRecords} 
            style={styles.refreshButton}
          >
            Refresh
          </Button>
          <Button 
            mode="outlined" 
            onPress={() => navigation.navigate('AddHealthcareRecord')} 
            style={styles.addButton}
          >
            Add New Record
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={renderItem}
          keyExtractor={(item) => item.record_id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordType: {
    flex: 1,
    marginRight: 8,
  },
  list: {
    paddingBottom: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  noRecordsText: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  refreshButton: {
    marginTop: 8,
    marginBottom: 8,
  },
  addButton: {
    marginTop: 8,
  },
  searchBar: {
    marginBottom: 16,
  },
  activeChip: {
    backgroundColor: '#c8e6c9',
  },
  completedChip: {
    backgroundColor: '#bbdefb',
  },
  cancelledChip: {
    backgroundColor: '#ffcdd2',
  },
});