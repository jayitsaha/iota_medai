import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Button, Title, Card, Paragraph, Searchbar, Chip, ActivityIndicator, Text, Divider } from 'react-native-paper';
import { fetchMarketplaceServices } from '../services/marketplaceService';

export default function MarketplaceScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [error, setError] = useState(null);
  const [isProvider, setIsProvider] = useState(true); // In a real app, this would come from auth state

  const categories = [
    { id: 'consultations', name: 'Remote Consultations' },
    { id: 'homecare', name: 'Home Care' },
    { id: 'prenatal', name: 'Prenatal Services' },
    { id: 'wellness', name: 'Wellness' },
    { id: 'therapy', name: 'Therapy' }
  ];

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMarketplaceServices();
      setServices(data);
      setFilteredServices(data);
    } catch (err) {
      console.error('Error fetching marketplace services:', err);
      setError('Failed to load healthcare services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterServices();
  }, [searchQuery, selectedCategory, services]);

  const filterServices = () => {
    let filtered = [...services];
    
    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(service => 
        service.title.toLowerCase().includes(query) ||
        service.provider.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredServices(filtered);
  };

  const renderServiceItem = ({ item }) => (
    <Card 
      style={styles.serviceCard}
      onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.id })}
    >
      <Card.Content>
        <View style={styles.serviceHeader}>
          <Title>{item.title}</Title>
          <Chip style={styles.priceChip}>{item.price} MEDAI</Chip>
        </View>
        <Text style={styles.providerText}>By {item.provider}</Text>
        <Paragraph numberOfLines={2} style={styles.description}>
          {item.description}
        </Paragraph>
        <View style={styles.serviceFooter}>
          <Chip icon="tag" style={styles.categoryChip}>{item.categoryName}</Chip>
          <Chip icon="star" style={styles.ratingChip}>{item.rating} ★</Chip>
        </View>
      </Card.Content>
    </Card>
  );

  const renderCategoryChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryChipsContainer}
    >
      <Chip 
        mode={selectedCategory === null ? "flat" : "outlined"}
        selected={selectedCategory === null}
        onPress={() => setSelectedCategory(null)}
        style={styles.categoryFilterChip}
      >
        All
      </Chip>
      
      {categories.map(category => (
        <Chip
          key={category.id}
          mode={selectedCategory === category.id ? "flat" : "outlined"}
          selected={selectedCategory === category.id}
          onPress={() => setSelectedCategory(category.id)}
          style={styles.categoryFilterChip}
        >
          {category.name}
        </Chip>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading healthcare services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>Healthcare Marketplace</Title>
          <Paragraph style={styles.subtitle}>
            Discover and book healthcare services secured by IOTA blockchain
          </Paragraph>
        </Card.Content>
      </Card>
      
      <Searchbar
        placeholder="Search services..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {renderCategoryChips()}
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={loadServices}>Retry</Button>
        </View>
      ) : filteredServices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery || selectedCategory ? 
              'No services found matching your criteria' : 
              'No services available at the moment'}
          </Text>
          <Button mode="contained" onPress={loadServices}>Refresh</Button>
        </View>
      ) : (
        <FlatList
          data={filteredServices}
          renderItem={renderServiceItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.servicesList}
        />
      )}
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          icon="calendar-check" 
          onPress={() => navigation.navigate('MyBookings')}
          style={styles.actionButton}
        >
          My Bookings
        </Button>
        
        {isProvider && (
          <Button 
            mode="contained" 
            icon="medical-bag" 
            onPress={() => navigation.navigate('MyServices')}
            style={[styles.actionButton, styles.providerButton]}
          >
            My Services
          </Button>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
  },
  searchBar: {
    marginBottom: 16,
    elevation: 2,
  },
  categoryChipsContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  categoryFilterChip: {
    marginRight: 8,
    marginBottom: 16,
  },
  servicesList: {
    paddingBottom: 16,
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
  providerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  description: {
    marginBottom: 12,
  },
  serviceFooter: {
    flexDirection: 'row',
    marginTop: 8,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  buttonContainer: {
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  providerButton: {
    backgroundColor: '#4caf50',
  },
});