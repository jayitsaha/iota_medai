import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, ActivityIndicator, Text, Button, Chip, Searchbar } from 'react-native-paper';
import { fetchAllMedicines } from '../services/medicineService';

export default function MedicineListScreen({ navigation }) {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMedicines, setFilteredMedicines] = useState([]);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAllMedicines();
      setMedicines(data);
      setFilteredMedicines(data);
    } catch (err) {
      console.error('Error fetching medicines:', err);
      setError('Failed to load medicine records. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMedicines(medicines);
    } else {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filtered = medicines.filter(medicine => 
        medicine.name.toLowerCase().includes(lowercaseQuery) ||
        medicine.manufacturer.toLowerCase().includes(lowercaseQuery) ||
        medicine.serial_number.toLowerCase().includes(lowercaseQuery) ||
        medicine.batch_number.toLowerCase().includes(lowercaseQuery)
      );
      setFilteredMedicines(filtered);
    }
  }, [searchQuery, medicines]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMedicines();
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'unactivated':
        return <Chip style={styles.unactivatedChip}>Unactivated</Chip>;
      case 'activated':
        return <Chip style={styles.activatedChip}>Activated</Chip>;
      case 'recalled':
        return <Chip style={styles.recalledChip}>Recalled</Chip>;
      default:
        return <Chip>{status}</Chip>;
    }
  };

  const renderItem = ({ item }) => (
    <Card style={styles.card} onPress={() => navigation.navigate('VerifyMedicine', { serialNumber: item.serial_number })}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title style={styles.medicineName}>{item.name}</Title>
          {getStatusChip(item.status)}
        </View>
        <Paragraph>Manufacturer: {item.manufacturer}</Paragraph>
        <Paragraph>Serial Number: {item.serial_number}</Paragraph>
        <Paragraph>Batch: {item.batch_number}</Paragraph>
        <View style={styles.dates}>
          <Paragraph style={styles.date}>Produced: {item.production_date}</Paragraph>
          <Paragraph style={styles.date}>Expires: {item.expiration_date}</Paragraph>
        </View>
        {item.status === 'activated' && (
          <Paragraph style={styles.activatedText}>
            Activated on: {new Date(item.activation_timestamp).toLocaleString()}
          </Paragraph>
        )}
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading medicine records from IOTA...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadMedicines} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search medicines"
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {filteredMedicines.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.noRecordsText}>
            {searchQuery ? 'No matching medicines found' : 'No medicines registered'}
          </Text>
          <Button mode="contained" onPress={loadMedicines} style={styles.refreshButton}>
            Refresh
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredMedicines}
          renderItem={renderItem}
          keyExtractor={(item) => item.id || item.serial_number}
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
  medicineName: {
    flex: 1,
    marginRight: 8,
  },
  dates: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  date: {
    fontSize: 12,
  },
  list: {
    paddingBottom: 16,
  },
  activatedText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
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
  },
  retryButton: {
    marginTop: 8,
  },
  searchBar: {
    marginBottom: 16,
  },
  unactivatedChip: {
    backgroundColor: '#e0e0e0',
  },
  activatedChip: {
    backgroundColor: '#c8e6c9',
  },
  recalledChip: {
    backgroundColor: '#ffcdd2',
  },
});