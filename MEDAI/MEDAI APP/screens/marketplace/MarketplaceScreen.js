// src/screens/marketplace/MarketplaceScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  FlatList,
  RefreshControl,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchMarketplaceServices } from '../../services/marketplaceService';
import theme from '../../constants/theme';
import TextInput from '../../components/TextInput';



const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;

const MarketplaceScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('User');
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // const fadeAnim = useRef(new Value(0)).current;
  // const scrollX = useRef(new Value(0)).current;

  const categories = [
    { id: 'consultations', name: 'Remote Consultations' },
    { id: 'homecare', name: 'Home Care' },
    { id: 'wellness', name: 'Wellness' },
    { id: 'therapy', name: 'Therapy' },
    { id: 'prenatal', name: 'Prenatal Services' }
  ];

  // Load user data and services
  useEffect(() => {
    loadUserData();
    loadServices();
    
    // Animate components on mount
    // timing(fadeAnim, {
    //   toValue: 1,
    //   duration: 1000,
    //   useNativeDriver: true,
    // }).start();
    
    return () => {
      // Clean up
    };
  }, []);

  useEffect(() => {
    filterServices();
  }, [searchQuery, selectedCategory, services]);

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('user_name');
      if (name) {
        setUserName(name);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  const renderServiceItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.id })}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[theme.colors.accent.alzheimers.light, theme.colors.accent.alzheimers.main]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.serviceCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{item.title}</Text>
            <Text style={styles.providerName}>By {item.provider}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>{item.price} MEDAI</Text>
          </View>
        </View>
        
        <Text style={styles.serviceDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.cardFooter}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.categoryName}</Text>
          </View>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => setSelectedCategory(selectedCategory === item.id ? null : item.id)}
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.selectedCategoryItem
      ]}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.selectedCategoryText
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="medical" size={48} color={theme.colors.accent.alzheimers.main} />
        <Text style={styles.loadingText}>Loading Healthcare Services...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent.alzheimers.main]}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header]}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Hello, {userName}</Text>
              <Text style={styles.pageTitle}>Healthcare Marketplace</Text>
              <Text style={styles.pageSubtitle}>Find and book healthcare services secured by blockchain</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View 
          style={[
            styles.searchContainer, 
           
          ]}
        >
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Categories */}
        <View 
          style={[
            styles.categoriesContainer, 
            
          ]}
        >
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Services List */}
        <View 
          style={[
            styles.servicesContainer, 
            
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Services</Text>
            <TouchableOpacity 
              style={styles.sectionAction}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={styles.sectionActionText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.accent.alzheimers.main} />
            </TouchableOpacity>
          </View>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadServices}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredServices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="medical" size={48} color="#DDD" />
              <Text style={styles.emptyText}>
                {searchQuery || selectedCategory ? 
                  'No services found matching your criteria' : 
                  'No services available at the moment'}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadServices}>
                <Text style={styles.retryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={filteredServices}
              renderItem={renderServiceItem}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.servicesList}
            />
          )}
        </View>

        {/* Action Buttons */}
        <View 
          style={[
            styles.actionButtonsContainer, 
            
          ]}
        >
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('MyBookings')}
          >
            <LinearGradient
              colors={[theme.colors.accent.alzheimers.light, theme.colors.accent.alzheimers.main]}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="calendar" size={24} color="white" />
              <Text style={styles.actionButtonText}>My Bookings</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Wallet')}
          >
            <LinearGradient
              colors={['#5E72E4', '#825EE4']}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.actionButtonGradient}
            >
              <Ionicons name="wallet" size={24} color="white" />
              <Text style={styles.actionButtonText}>My Wallet</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  header: {
    paddingTop: StatusBar.currentHeight + 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 5,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  categoriesList: {
    paddingBottom: 15,
  },
  categoryItem: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedCategoryItem: {
    backgroundColor: theme.colors.accent.alzheimers.main,
  },
  categoryText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  servicesContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionActionText: {
    color: theme.colors.accent.alzheimers.main,
    fontWeight: '500',
    marginRight: 5,
  },
  servicesList: {
    paddingBottom: 10,
  },
  serviceCard: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 10,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  providerName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  priceContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  priceAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  serviceDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 15,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  categoryText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.accent.alzheimers.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  actionButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default MarketplaceScreen;