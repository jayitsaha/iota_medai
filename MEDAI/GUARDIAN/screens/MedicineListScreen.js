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
  Divider
} from 'react-native-paper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { fetchAllMedicines } from '../services/blockchainService';

const MedicineListScreen = ({ navigation }) => {
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadMedicines();
  }, []);

  useEffect(() => {
    filterMedicines();
  }, [medicines, searchQuery, filterStatus]);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const data = await fetchAllMedicines();
      setMedicines(data);
    } catch (error) {
      console.error('Error fetching medicines:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterMedicines = () => {
    let filtered = [...medicines];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(medicine => 
        medicine.name?.toLowerCase().includes(query) ||
        medicine.serial_number?.toLowerCase().includes(query) ||
        medicine.manufacturer?.toLowerCase().includes(query) ||
        medicine.batch_number?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(medicine => medicine.status === filterStatus);
    }
    
    setFilteredMedicines(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMedicines();
  };

  const renderMedicineItem = ({ item }) => (
    <Card 
      style={styles.medicineCard}
      onPress={() => navigation.navigate('VerifyMedicine', { serialNumber: item.serial_number })}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Title style={styles.medicineName}>{item.name}</Title>
          <Chip 
            style={
              item.status === 'unactivated' ? styles.statusUnactivated :
              item.status === 'activated' ? styles.statusActivated :
              styles.statusRecalled
            }
            textStyle={styles.statusChipText}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Chip>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.detailRow}>
          <Ionicons name="barcode-outline" size={16} color="#64748B" />
          <Text style={styles.detailLabel}>Serial:</Text>
          <Text style={styles.detailText}>{item.serial_number}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={16} color="#64748B" />
          <Text style={styles.detailLabel}>Manufacturer:</Text>
          <Text style={styles.detailText}>{item.manufacturer}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="layers-outline" size={16} color="#64748B" />
          <Text style={styles.detailLabel}>Batch:</Text>
          <Text style={styles.detailText}>{item.batch_number}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#64748B" />
          <Text style={styles.detailLabel}>Expires:</Text>
          <Text style={styles.detailText}>{item.expiration_date}</Text>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={() => navigation.navigate('VerifyMedicine', { serialNumber: item.serial_number })}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color="#4A6FA5" />
            <Text style={styles.verifyButtonText}>Verify</Text>
          </TouchableOpacity>
          
          {item.status === 'unactivated' && (
            <TouchableOpacity
              style={styles.activateButton}
              onPress={() => navigation.navigate('VerifyMedicine', { serialNumber: item.serial_number })}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#2A9D8F" />
              <Text style={styles.activateButtonText}>Activate</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Medicine Registry" />
        <Appbar.Action icon="plus" onPress={() => navigation.navigate('RegisterMedicine')} />
      </Appbar.Header>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search medicines..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterStatus === 'all' && styles.filterChipActive
            ]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === 'all' && styles.filterChipTextActive
            ]}>All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterStatus === 'unactivated' && styles.filterChipActive
            ]}
            onPress={() => setFilterStatus('unactivated')}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === 'unactivated' && styles.filterChipTextActive
            ]}>Unactivated</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterStatus === 'activated' && styles.filterChipActive
            ]}
            onPress={() => setFilterStatus('activated')}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === 'activated' && styles.filterChipTextActive
            ]}>Activated</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterChip,
              filterStatus === 'recalled' && styles.filterChipActive
            ]}
            onPress={() => setFilterStatus('recalled')}
          >
            <Text style={[
              styles.filterChipText,
              filterStatus === 'recalled' && styles.filterChipTextActive
            ]}>Recalled</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A6FA5" />
          <Text style={styles.loadingText}>Loading medicines from blockchain...</Text>
        </View>
      ) : filteredMedicines.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="medkit-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No medicines found matching your search' : 'No medicines registered yet'}
          </Text>
          <Button 
            mode="contained" 
            icon="plus" 
            onPress={() => navigation.navigate('RegisterMedicine')}
            style={styles.addButton}
          >
            Register New Medicine
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredMedicines}
          renderItem={renderMedicineItem}
          keyExtractor={item => item.id || item.serial_number}
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
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#4A6FA5',
  },
  filterChipText: {
    fontSize: 12,
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
  },
  loadingText: {
    marginTop: 16,
    color: '#64748B',
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
  medicineCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicineName: {
    flex: 1,
    fontSize: 18,
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
  statusChipText: {
    fontSize: 12,
  },
  divider: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    marginLeft: 8,
    marginRight: 4,
    fontSize: 14,
    color: '#64748B',
    width: 90,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#334155',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E3F2FD',
    borderRadius: 4,
    marginLeft: 8,
  },
  verifyButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#4A6FA5',
    fontWeight: '500',
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    marginLeft: 8,
  },
  activateButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#2A9D8F',
    fontWeight: '500',
  },
});

export default MedicineListScreen;