// src/screens/marketplace/MyBookingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  StatusBar,
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { fetchMyBookings, cancelBooking } from '../../services/marketplaceService';
import theme from '../../constants/theme';

const MyBookingsScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyBookings();
      setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load your bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  };

  const handleCancelBooking = (bookingId) => {
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking?",
      [
        {
          text: "No",
          style: "cancel"
        },
        {
          text: "Yes, Cancel",
          onPress: () => processCancelBooking(bookingId)
        }
      ]
    );
  };

  const processCancelBooking = async (bookingId) => {
    try {
      setLoading(true);
      const result = await cancelBooking(bookingId);
      
      if (result.success) {
        // Remove the cancelled booking from the list
        setBookings(bookings.filter(booking => booking.id !== bookingId));
        Alert.alert("Success", "Your booking has been cancelled successfully.");
      } else {
        throw new Error(result.error || 'Failed to cancel booking');
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      Alert.alert("Error", err.message || "There was an error cancelling your booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderBookingItem = ({ item }) => {
    const appointmentDate = new Date(item.appointmentDate);
    const isPast = appointmentDate < new Date();
    const isToday = appointmentDate.toDateString() === new Date().toDateString();
    const isCancelled = item.status === 'Cancelled';
    const isCompleted = item.status === 'Completed';
    
    let statusColor = '#2DCE89'; // Scheduled (green)
    if (isCancelled) statusColor = '#FB6340'; // Cancelled (orange/red)
    else if (isCompleted) statusColor = '#5E72E4'; // Completed (blue)
    else if (isToday) statusColor = '#11CDEF'; // Today (cyan)
    
    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View style={styles.bookingTitleContainer}>
            <Text style={styles.bookingTitle}>{item.serviceTitle}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
          
          <Text style={styles.bookingProvider}>Provider: {item.provider}</Text>
        </View>
        
        <View style={styles.bookingDetails}>
          <View style={styles.bookingDetailItem}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.accent.alzheimers.main} />
            <Text style={styles.bookingDetailText}>
              {appointmentDate.toLocaleDateString()} {isToday && '(Today)'}
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="time-outline" size={18} color={theme.colors.accent.alzheimers.main} />
            <Text style={styles.bookingDetailText}>
              {appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          
          <View style={styles.bookingDetailItem}>
            <Ionicons name="wallet-outline" size={18} color={theme.colors.accent.alzheimers.main} />
            <Text style={styles.bookingDetailText}>
              {item.price} MEDAI
            </Text>
          </View>
        </View>
        
        {item.transactionId && (
          <View style={styles.transactionContainer}>
            <Text style={styles.transactionLabel}>Transaction ID:</Text>
            <Text style={styles.transactionId} numberOfLines={1} ellipsizeMode="middle">
              {item.transactionId}
            </Text>
          </View>
        )}
        
        <View style={styles.bookingActions}>
          {!isPast && !isCancelled && (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => handleCancelBooking(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
          
          {isCompleted && (
            <TouchableOpacity 
              style={styles.rateButton}
              onPress={() => navigation.navigate('RateService', { bookingId: item.id, serviceTitle: item.serviceTitle })}
            >
              <Text style={styles.rateButtonText}>Rate Service</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.serviceId })}
          >
            <Text style={styles.viewButtonText}>View Service</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent.alzheimers.main} />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>My Bookings</Text>
        
        <View style={{ width: 40 }} />
      </View>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar" size={64} color="#DDD" />
          <Text style={styles.emptyText}>You don't have any bookings yet</Text>
          <TouchableOpacity 
            style={styles.browseButton}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.browseButtonText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.bookingsList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.accent.alzheimers.main]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: StatusBar.currentHeight + 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  browseButton: {
    backgroundColor: theme.colors.accent.alzheimers.main,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bookingsList: {
    padding: 20,
  },
  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  bookingHeader: {
    marginBottom: 15,
  },
  bookingTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookingProvider: {
    fontSize: 14,
    color: '#666',
  },
  bookingDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 10,
  },
  bookingDetailText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 5,
  },
  transactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9FF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 15,
  },
  transactionLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 5,
  },
  transactionId: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: theme.colors.accent.alzheimers.main,
    flex: 1,
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#FFE0E0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  cancelButtonText: {
    color: '#D32F2F',
    fontSize: 14,
    fontWeight: '500',
  },
  rateButton: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  rateButtonText: {
    color: '#FFA000',
    fontSize: 14,
    fontWeight: '500',
  },
  viewButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  viewButtonText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MyBookingsScreen;