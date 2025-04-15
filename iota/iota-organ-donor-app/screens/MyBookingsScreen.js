import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Text, Chip, ActivityIndicator, Divider, List } from 'react-native-paper';
import { fetchMyBookings, cancelBooking } from '../services/marketplaceService';

export default function MyBookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);

  useEffect(() => {
    loadBookings();
    
    // Refresh bookings when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      loadBookings();
    });
    
    return unsubscribe;
  }, [navigation]);

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
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const handleCancelBooking = (bookingId) => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelingId(bookingId);
              await cancelBooking(bookingId);
              // Update bookings list
              setBookings(bookings.map(booking => 
                booking.id === bookingId 
                  ? { ...booking, status: 'Cancelled' } 
                  : booking
              ));
              Alert.alert('Success', 'Your booking has been cancelled successfully');
            } catch (err) {
              console.error('Error cancelling booking:', err);
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            } finally {
              setCancelingId(null);
            }
          }
        }
      ]
    );
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'Scheduled':
        return <Chip style={styles.scheduledChip}>Scheduled</Chip>;
      case 'Completed':
        return <Chip style={styles.completedChip}>Completed</Chip>;
      case 'Cancelled':
        return <Chip style={styles.cancelledChip}>Cancelled</Chip>;
      default:
        return <Chip>{status}</Chip>;
    }
  };

  const renderBookingItem = ({ item }) => {
    const bookingDate = new Date(item.appointmentDate);
    const isUpcoming = bookingDate > new Date();
    const isPast = bookingDate < new Date() && item.status !== 'Cancelled';
    
    return (
      <Card style={styles.bookingCard}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title style={styles.serviceTitle}>{item.serviceTitle}</Title>
            {getStatusChip(item.status)}
          </View>
          
          <Text style={styles.providerText}>Provider: {item.provider}</Text>
          
          <List.Item
            title="Appointment Date"
            description={bookingDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            left={props => <List.Icon {...props} icon="calendar" />}
            style={styles.listItem}
          />
          
          <List.Item
            title="Booked On"
            description={new Date(item.bookingDate).toLocaleDateString()}
            left={props => <List.Icon {...props} icon="clock-outline" />}
            style={styles.listItem}
          />
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price:</Text>
            <Text style={styles.priceValue}>{item.price} MEDAI</Text>
          </View>
          
          {item.transactionId && (
            <Text style={styles.transactionId} numberOfLines={1} ellipsizeMode="middle">
              Transaction: {item.transactionId}
            </Text>
          )}
          
          {isUpcoming && item.status === 'Scheduled' && (
            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                icon="calendar-edit"
                onPress={() => navigation.navigate('ServiceDetails', { serviceId: item.serviceId })}
                style={styles.detailsButton}
              >
                View Details
              </Button>
              <Button 
                mode="outlined" 
                icon="close-circle"
                onPress={() => handleCancelBooking(item.id)}
                loading={cancelingId === item.id}
                disabled={cancelingId === item.id}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
            </View>
          )}
          
          {isPast && (
            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                icon="star"
                onPress={() => navigation.navigate('RateService', { bookingId: item.id, serviceTitle: item.serviceTitle })}
                style={styles.rateButton}
              >
                Rate Service
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>My Healthcare Bookings</Title>
          <Paragraph style={styles.subtitle}>
            All your bookings are secured on the IOTA blockchain
          </Paragraph>
        </Card.Content>
      </Card>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={loadBookings}>
            Retry
          </Button>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You don't have any bookings yet</Text>
          <Button 
            mode="contained" 
            icon="shopping"
            onPress={() => navigation.navigate('Marketplace')}
            style={styles.browseButton}
          >
            Browse Services
          </Button>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id}
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
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
  },
  centerContainer: {
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
  browseButton: {
    marginTop: 8,
  },
  list: {
    padding: 16,
  },
  bookingCard: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    flex: 1,
    fontSize: 18,
    marginRight: 8,
  },
  providerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  listItem: {
    paddingLeft: 0,
    paddingVertical: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 4,
  },
  priceLabel: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  priceValue: {
    fontWeight: 'bold',
    color: '#1976D2',
  },
  transactionId: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  detailsButton: {
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 8,
    borderColor: '#F44336',
    color: '#F44336',
  },
  rateButton: {
    flex: 1,
  },
  scheduledChip: {
    backgroundColor: '#e3f2fd',
  },
  completedChip: {
    backgroundColor: '#e8f5e9',
  },
  cancelledChip: {
    backgroundColor: '#ffebee',
  },
});