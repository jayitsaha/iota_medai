import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  FAB, 
  Text, 
  Chip,
  ActivityIndicator,
  Portal,
  Dialog,
  Divider
} from 'react-native-paper';
import { fetchMyServices, deleteService } from '../services/marketplaceService';

export default function MyServicesScreen({ navigation, route }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // If a service was added or updated, refresh the list
  useEffect(() => {
    loadServices();
  }, [route.params?.updated]);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyServices();
      setServices(data);
    } catch (err) {
      console.error('Error fetching my services:', err);
      setError('Failed to load your services. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadServices();
  };

  const handleEditService = (service) => {
    navigation.navigate('AddService', { service });
  };

  const confirmDelete = (service) => {
    setServiceToDelete(service);
    setDeleteDialogVisible(true);
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    
    try {
      setDeleteLoading(true);
      const response = await deleteService(serviceToDelete.id);
      
      if (response.success) {
        // Remove from list
        setServices(services.filter(s => s.id !== serviceToDelete.id));
        setDeleteDialogVisible(false);
        setServiceToDelete(null);
      } else {
        setError('Failed to delete service: ' + (response.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error deleting service:', err);
      setError('Failed to delete service. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const renderServiceItem = ({ item }) => (
    <Card style={styles.serviceCard}>
      <Card.Content>
        <View style={styles.serviceHeader}>
          <Title>{item.title}</Title>
          <Chip style={styles.priceChip}>{item.price} MEDAI</Chip>
        </View>
        
        <Paragraph numberOfLines={2} style={styles.description}>
          {item.description}
        </Paragraph>
        
        <View style={styles.serviceFooter}>
          <Chip icon="tag" style={styles.categoryChip}>{item.categoryName}</Chip>
          {item.rating > 0 && (
            <Chip icon="star" style={styles.ratingChip}>{item.rating.toFixed(1)} ★</Chip>
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.actionButtons}>
          <Button 
            mode="outlined" 
            icon="pencil" 
            onPress={() => handleEditService(item)}
            style={styles.actionButton}
          >
            Edit
          </Button>
          <Button 
            mode="outlined" 
            icon="delete" 
            onPress={() => confirmDelete(item)}
            style={[styles.actionButton, styles.deleteButton]}
          >
            Delete
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="contained" onPress={loadServices} style={styles.retryButton}>
              Retry
            </Button>
          </Card.Content>
        </Card>
      )}
      
      {services.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            You don't have any services yet.
          </Text>
          <Text style={styles.emptySubtext}>
            Create your first healthcare service to start accepting bookings.
          </Text>
          <Button 
            mode="contained" 
            icon="plus" 
            onPress={() => navigation.navigate('AddService')}
            style={styles.addFirstButton}
          >
            Add Your First Service
          </Button>
        </View>
      ) : (
        <FlatList
          data={services}
          renderItem={renderServiceItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.servicesList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('AddService')}
        visible={services.length > 0}
      />
      
      <Portal>
        <Dialog
          visible={deleteDialogVisible}
          onDismiss={() => setDeleteDialogVisible(false)}
        >
          <Dialog.Title>Delete Service</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to delete "{serviceToDelete?.title}"? This action cannot be undone.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button 
              onPress={handleDeleteService} 
              loading={deleteLoading}
              disabled={deleteLoading}
              color="#f44336"
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  servicesList: {
    padding: 16,
    paddingBottom: 80, // Extra space for FAB
  },
  serviceCard: {
    marginBottom: 16,
    elevation: 3,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  description: {
    marginBottom: 12,
  },
  serviceFooter: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#e8f5e9',
  },
  ratingChip: {
    backgroundColor: '#fff8e1',
  },
  priceChip: {
    backgroundColor: '#e3f2fd',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  deleteButton: {
    borderColor: '#f44336',
    color: '#f44336',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  addFirstButton: {
    paddingHorizontal: 16,
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
});