import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Title, Card, Paragraph, Text, Divider, List, Chip, ActivityIndicator, Avatar, Portal, Modal } from 'react-native-paper';
import { fetchServiceDetails, bookService } from '../services/marketplaceService';
import { useWallet } from '../services/walletService';
import { CONFIG } from '../config';

export default function ServiceDetailsScreen({ route, navigation }) {
  const { serviceId } = route.params;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const { balance, walletAddress, makePayment } = useWallet();

  useEffect(() => {
    // Reset states when serviceId changes
    setService(null);
    setLoading(true);
    setError(null);
    
    // Make sure we have a valid serviceId before attempting to load
    if (!serviceId) {
      setError('Invalid service ID');
      setLoading(false);
      return;
    }
    
    loadServiceDetails();
  }, [serviceId]);

  const loadServiceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Loading service details for ID: ${serviceId}`);
      
      const data = await fetchServiceDetails(serviceId);
      
      // Verify we got valid data back
      if (!data || !data.id) {
        throw new Error('Invalid service data received');
      }
      
      setService(data);
    } catch (err) {
      console.error('Error fetching service details:', err);
      setError('Failed to load service details. Please try again.');
      
      // If we're in development/demo mode, use a fallback service object
      if (CONFIG?.DEMO_MODE) {
        console.warn('Using fallback service data for development');
        setService({
          id: serviceId || 'demo-service',
          title: 'Demo Service (Fallback)',
          provider: 'Demo Provider',
          providerCredentials: 'Licensed Provider',
          category: 'consultations',
          categoryName: 'Remote Consultations',
          description: 'This is a fallback service used when the actual service fails to load.',
          price: 100,
          rating: 4.5,
          features: ['Fallback feature 1', 'Fallback feature 2'],
          duration: '45 minutes',
          location: 'Remote',
          serviceType: 'Consultation',
          providerWalletAddress: 'DEMOWALLETADDRESS9999999999999999999999999999999999999999999999999999999999'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBookService = async () => {
    if (!selectedDate) {
      Alert.alert('Please select a date', 'You need to select a date to book this service');
      return;
    }

    // Check balance first
    if (balance < (service?.price || 0)) {
      Alert.alert(
        'Insufficient funds', 
        'You do not have enough MEDAI tokens to book this service. Would you like to add funds to your wallet?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Add Funds', 
            onPress: () => {
              setModalVisible(false);
              navigation.navigate('Wallet', { screen: 'AddFunds' });
            }
          }
        ]
      );
      return;
    }

    try {
      setBookingLoading(true);


      console.log("PROVIDER ID,", service);
      
      // Get the provider wallet address from the service
      let providerWalletAddress = service?.providerWalletAddress;
      
      // If no provider wallet address, show error
      if (!providerWalletAddress) {
        throw new Error('This service provider does not have a configured wallet address');
      }
      
      // First attempt to book the service
      const result = await bookService(serviceId, selectedDate);
      
      // Check for booking errors
      if (!result.success) {
        throw new Error(result.error || 'Failed to book service');
      }
      
      // If booking was successful, try to process payment
      try {
        await makePayment(providerWalletAddress, service.price);
      } catch (paymentError) {
        console.error('Payment error:', paymentError);
        
        // Show a friendly error but proceed with the booking (payment can be made later)
        Alert.alert(
          'Payment Processing Issue',
          'Your booking was created, but there was an issue processing your payment. You can try to complete the payment later from your bookings.',
          [{ text: 'OK' }]
        );
        
        // Continue with navigation despite payment error
        setModalVisible(false);
        navigation.navigate('BookingConfirmation', { 
          bookingId: result.bookingId,
          serviceTitle: service?.title || 'Service',
          provider: service?.provider || 'Provider',
          date: selectedDate,
          transactionId: result.transactionId,
          paymentStatus: 'pending'
        });
        return;
      }
      
      // Everything succeeded - booking and payment
      setModalVisible(false);
      navigation.navigate('BookingConfirmation', { 
        bookingId: result.bookingId,
        serviceTitle: service?.title || 'Service',
        provider: service?.provider || 'Provider',
        date: selectedDate,
        transactionId: result.transactionId,
        paymentStatus: 'completed'
      });
    } catch (err) {
      console.error('Error booking service:', err);
      
      // Handle specific error cases
      if (err.message?.includes('wallet address')) {
        Alert.alert(
          'Wallet Configuration Issue',
          'There appears to be an issue with the wallet configuration. Please go to the Wallet tab to ensure your wallet is properly set up.',
          [
            { text: 'Stay Here', style: 'cancel' },
            { 
              text: 'Go to Wallet', 
              onPress: () => {
                setModalVisible(false);
                navigation.navigate('Wallet');
              }
            }
          ]
        );
      } else {
        // Generic error
        Alert.alert(
          'Booking Error', 
          err.message || 'Failed to book the service. Please try again later.'
        );
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const showModal = () => setModalVisible(true);
  const hideModal = () => setModalVisible(false);

  // Generate next 7 days for appointment selection
  const getAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  // Check if service data is valid
  const isServiceValid = service && service.title && service.price;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading service details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadServiceDetails} style={{marginTop: 16}}>
          Retry
        </Button>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={{marginTop: 8}}>
          Go Back
        </Button>
      </View>
    );
  }

  if (!service && !loading && !error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Service information unavailable</Text>
        <Button 
          mode="contained" 
          onPress={loadServiceDetails} 
          style={{marginTop: 16}}
        >
          Try Again
        </Button>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()}
          style={{marginTop: 8}}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>{service?.title || 'Service Details'}</Title>
          <View style={styles.headerInfo}>
            <Chip icon="tag" style={styles.categoryChip}>{service?.categoryName || 'Category'}</Chip>
            <Chip icon="star" style={styles.ratingChip}>{service?.rating || 0} ★</Chip>
          </View>
          <Paragraph style={styles.price}>{service?.price || 0} MEDAI tokens</Paragraph>
        </Card.Content>
      </Card>
      
      <Card style={styles.detailsCard}>
        <Card.Content>
          <Title style={styles.sectionTitle}>About This Service</Title>
          <Paragraph style={styles.description}>
            {service?.description || 'No description available.'}
          </Paragraph>
          
          <Divider style={styles.divider} />
          
          <View style={styles.providerContainer}>
            <Avatar.Icon size={40} icon="account" />
            <View style={styles.providerInfo}>
              <Text style={styles.providerName}>{service?.provider || 'Provider'}</Text>
              <Text style={styles.providerCredentials}>{service?.providerCredentials || 'Healthcare Provider'}</Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <Title style={styles.sectionTitle}>Service Details</Title>
          
          <List.Item
            title="Duration"
            description={service?.duration || 'Not specified'}
            left={props => <List.Icon {...props} icon="clock-outline" />}
          />
          
          <List.Item
            title="Service Type"
            description={service?.serviceType || 'Not specified'}
            left={props => <List.Icon {...props} icon="medical-bag" />}
          />
          
          <List.Item
            title="Location"
            description={service?.location || 'Not specified'}
            left={props => <List.Icon {...props} icon="map-marker" />}
          />
          
          {service?.features && service.features.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <Title style={styles.sectionTitle}>Features</Title>
              
              {service.features.map((feature, index) => (
                <List.Item
                  key={index}
                  title={feature}
                  left={props => <List.Icon {...props} icon="check-circle" color="#4CAF50" />}
                />
              ))}
            </>
          )}
          
          <Divider style={styles.divider} />
          
          <Title style={styles.sectionTitle}>Blockchain Secured</Title>
          <Paragraph style={styles.blockchainInfo}>
            All service bookings and payments are secured and verified through IOTA blockchain technology,
            ensuring transparency, security, and immutability of your healthcare service agreements.
          </Paragraph>
        </Card.Content>
      </Card>
      
      <Button 
        mode="contained" 
        onPress={showModal}
        style={styles.bookButton}
        icon="calendar-plus"
        disabled={!isServiceValid}
      >
        {isServiceValid ? 'Book This Service' : 'Service Unavailable'}
      </Button>
      
      <Portal>
        <Modal visible={modalVisible} onDismiss={hideModal} contentContainerStyle={styles.modalContainer}>
          <Title style={styles.modalTitle}>Book Appointment</Title>
          <Divider style={styles.divider} />
          
          <Paragraph style={styles.modalSubtitle}>
            Select a date for your appointment:
          </Paragraph>
          
          <View style={styles.dateContainer}>
            {getAvailableDates().map((date, index) => (
              <Chip
                key={index}
                selected={selectedDate === date.toISOString().split('T')[0]}
                onPress={() => setSelectedDate(date.toISOString().split('T')[0])}
                style={styles.dateChip}
                mode={selectedDate === date.toISOString().split('T')[0] ? "flat" : "outlined"}
              >
                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </Chip>
            ))}
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.paymentSummary}>
            <Text style={styles.paymentTitle}>Payment Summary</Text>
            <View style={styles.paymentRow}>
              <Text>Service Fee:</Text>
              <Text>{service?.price || 0} MEDAI</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text>Your Balance:</Text>
              <Text>{balance} MEDAI</Text>
            </View>
          </View>
          
          <View style={styles.modalActions}>
            <Button 
              mode="outlined" 
              onPress={hideModal} 
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={handleBookService}
              loading={bookingLoading}
              disabled={bookingLoading || !selectedDate || balance < (service?.price || 0)}
              style={styles.modalButton}
            >
              Confirm Booking
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
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
  headerCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 3,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#e8f5e9',
  },
  ratingChip: {
    backgroundColor: '#fff8e1',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1976D2',
  },
  detailsCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  description: {
    lineHeight: 22,
  },
  divider: {
    marginVertical: 16,
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  providerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  providerCredentials: {
    fontSize: 14,
    color: '#666',
  },
  blockchainInfo: {
    fontStyle: 'italic',
    color: '#666',
  },
  bookButton: {
    margin: 16,
    marginTop: 8,
    paddingVertical: 8,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    textAlign: 'center',
    fontSize: 20,
  },
  modalSubtitle: {
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dateChip: {
    margin: 4,
  },
  paymentSummary: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
});