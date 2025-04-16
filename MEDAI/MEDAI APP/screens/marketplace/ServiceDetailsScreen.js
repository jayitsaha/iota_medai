// src/screens/marketplace/ServiceDetailsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fetchServiceDetails, bookService } from '../../services/marketplaceService';
import { useWallet } from '../../services/walletService';
import theme from '../../constants/theme';

const ServiceDetailsScreen = ({ route, navigation }) => {
  const { serviceId } = route.params;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [booking, setBooking] = useState(false);

  const { balance, makePayment } = useWallet();

  useEffect(() => {
    loadServiceDetails();
  }, []);

  const loadServiceDetails = async () => {
    try {
      setLoading(true);
      const data = await fetchServiceDetails(serviceId);
      setService(data);
    } catch (err) {
      console.error('Error fetching service details:', err);
      setError('Failed to load service details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(false);
    setDate(currentDate);
  };

  const handleBookService = async () => {
    // Check if user has enough balance
    if (balance < service.price) {
      Alert.alert(
        "Insufficient Balance",
        "You don't have enough MEDAI tokens to book this service. Please add funds to your wallet.",
        [
          {
            text: "Go to Wallet",
            onPress: () => navigation.navigate('Wallet')
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
      return;
    }

    // Confirm booking
    Alert.alert(
      "Confirm Booking",
      `You are about to book "${service.title}" for ${date.toLocaleDateString()} at a cost of ${service.price} MEDAI tokens.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Confirm Booking",
          onPress: processBooking
        }
      ]
    );
  };

  const processBooking = async () => {
    try {
      setBooking(true);
      
      // Book the service
      const bookingResult = await bookService(serviceId, date.toISOString());
      
      if (bookingResult.success) {
        // Make payment
        await makePayment(service.providerWalletAddress, service.price);
        
        // Show success message
        Alert.alert(
          "Booking Successful",
          "Your service has been booked successfully!",
          [
            {
              text: "View My Bookings",
              onPress: () => navigation.navigate('MyBookings')
            },
            {
              text: "OK",
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        throw new Error(bookingResult.error || 'Failed to book service');
      }
    } catch (err) {
      console.error('Error booking service:', err);
      Alert.alert(
        "Booking Failed",
        err.message || "There was an error booking this service. Please try again."
      );
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent.alzheimers.main} />
        <Text style={styles.loadingText}>Loading service details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadServiceDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!service) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <ScrollView style={styles.container}>
        {/* Service Header */}
        <LinearGradient
          colors={[theme.colors.accent.alzheimers.light, theme.colors.accent.alzheimers.main]}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.headerGradient}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <View style={styles.providerRow}>
              <View style={styles.providerCircle}>
                <Ionicons name="person" size={24} color="white" />
              </View>
              <Text style={styles.providerName}>{service.provider}</Text>
            </View>
            
            <View style={styles.ratingPriceRow}>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{service.rating} Rating</Text>
              </View>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceAmount}>{service.price} MEDAI</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        
        {/* Service Details */}
        <View style={styles.detailsContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{service.description}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Service Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={20} color={theme.colors.accent.alzheimers.main} />
              <View>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{service.duration}</Text>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={20} color={theme.colors.accent.alzheimers.main} />
              <View>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{service.location}</Text>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="medical-outline" size={20} color={theme.colors.accent.alzheimers.main} />
              <View>
                <Text style={styles.detailLabel}>Service Type</Text>
                <Text style={styles.detailValue}>{service.serviceType}</Text>
              </View>
            </View>
            
            <View style={styles.detailItem}>
              <Ionicons name="ribbon-outline" size={20} color={theme.colors.accent.alzheimers.main} />
              <View>
                <Text style={styles.detailLabel}>Provider</Text>
                <Text style={styles.detailValue}>{service.providerCredentials || 'Licensed Professional'}</Text>
              </View>
            </View>
          </View>
          
          {service.features && service.features.length > 0 && (
            <>
              <View style={styles.divider} />
              
              <Text style={styles.sectionTitle}>Included Features</Text>
              <View style={styles.featuresList}>
                {service.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent.alzheimers.main} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          
          {service.ratings && service.ratings.length > 0 && (
            <>
              <View style={styles.divider} />
              
              <View style={styles.reviewsHeader}>
                <Text style={styles.sectionTitle}>Reviews</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              
              {service.ratings.map((rating, index) => (
                <View key={index} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerCircle}>
                        <Ionicons name="person" size={16} color="white" />
                      </View>
                      <Text style={styles.reviewerName}>{rating.user}</Text>
                    </View>
                    
                    <View style={styles.reviewRating}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.reviewRatingText}>{rating.rating}</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.reviewComment}>{rating.comment}</Text>
                  <Text style={styles.reviewDate}>{new Date(rating.date).toLocaleDateString()}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
      
      {/* Booking Section */}
      <View style={styles.bookingContainer}>
        <View style={styles.datePickerRow}>
          <Text style={styles.datePickerLabel}>Appointment Date:</Text>
          <TouchableOpacity 
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.datePickerText}>{date.toLocaleDateString()}</Text>
            <Ionicons name="calendar" size={20} color={theme.colors.accent.alzheimers.main} />
          </TouchableOpacity>
          
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={onChange}
              minimumDate={new Date()}
            />
          )}
        </View>
        
        <TouchableOpacity 
          style={[
            styles.bookButton,
            booking && styles.bookButtonDisabled
          ]}
          onPress={handleBookService}
          disabled={booking}
        >
          {booking ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="calendar-check" size={20} color="white" />
              <Text style={styles.bookButtonText}>Book Service</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
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
  headerGradient: {
    paddingTop: StatusBar.currentHeight + 10,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerContent: {
    paddingHorizontal: 5,
  },
  serviceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  providerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  providerName: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  ratingPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  ratingText: {
    color: '#FFFFFF',
    marginLeft: 5,
  },
  priceContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  detailsContainer: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 100, // Space for booking section
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  detailItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: '#999',
    marginLeft: 10,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginLeft: 10,
    marginTop: 5,
  },
  featuresList: {
    marginBottom: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: theme.colors.accent.alzheimers.main,
    fontWeight: '500',
  },
  reviewItem: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.accent.alzheimers.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  reviewRatingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFA000',
    marginLeft: 5,
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  bookingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    flexDirection: 'column',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  datePickerLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent.alzheimers.main,
    paddingVertical: 15,
    borderRadius: 10,
  },
  bookButtonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
});

export default ServiceDetailsScreen;