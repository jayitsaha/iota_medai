import React from 'react';
import { View, StyleSheet, ScrollView, Share } from 'react-native';
import { Button, Title, Card, Paragraph, Text, Divider, List, Avatar } from 'react-native-paper';
import LottieView from 'lottie-react-native';

export default function BookingConfirmationScreen({ route, navigation }) {
  const { bookingId, serviceTitle, provider, date, transactionId } = route.params;
  
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I've booked a healthcare service: ${serviceTitle} with ${provider} on ${formattedDate}. Secured on the IOTA blockchain!`,
        title: 'My Healthcare Appointment'
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.animationContainer}>
        {/* <LottieView
          source={require('../assets/confirmation-animation.json')}
          autoPlay
          loop={false}
          style={styles.animation}
        /> */}
      </View>
      
      <Card style={styles.confirmationCard}>
        <Card.Content>
          <Title style={styles.title}>Booking Confirmed!</Title>
          <Paragraph style={styles.subtitle}>
            Your healthcare service has been booked and secured on the IOTA blockchain
          </Paragraph>
          
          <Divider style={styles.divider} />
          
          <List.Item
            title="Service"
            description={serviceTitle}
            left={props => <List.Icon {...props} icon="medical-bag" />}
            style={styles.listItem}
          />
          
          <List.Item
            title="Provider"
            description={provider}
            left={props => <List.Icon {...props} icon="account" />}
            style={styles.listItem}
          />
          
          <List.Item
            title="Date"
            description={formattedDate}
            left={props => <List.Icon {...props} icon="calendar" />}
            style={styles.listItem}
          />
          
          <List.Item
            title="Booking ID"
            description={bookingId}
            left={props => <List.Icon {...props} icon="identifier" />}
            style={styles.listItem}
          />
          
          <Divider style={styles.divider} />
          
          <View style={styles.blockchainInfoContainer}>
            <Avatar.Icon size={40} icon="cube-outline" style={styles.blockchainIcon} />
            <View style={styles.blockchainTextContainer}>
              <Text style={styles.blockchainTitle}>Blockchain Verification</Text>
              <Text style={styles.blockchainDescription}>
                This booking has been recorded on the IOTA blockchain for security and transparency.
              </Text>
              <Text style={styles.transactionId} selectable>
                Transaction ID: {transactionId.substring(0, 10)}...{transactionId.substring(transactionId.length - 10)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      <Card style={styles.instructionsCard}>
        <Card.Content>
          <Title style={styles.instructionsTitle}>What's Next?</Title>
          <List.Item
            title="Prepare for your appointment"
            description="Review any instructions sent by your provider"
            left={props => <List.Icon {...props} icon="clipboard-text-outline" color="#4CAF50" />}
          />
          <List.Item
            title="Get reminders"
            description="You will receive a notification 24 hours before your appointment"
            left={props => <List.Icon {...props} icon="bell-outline" color="#4CAF50" />}
          />
          <List.Item
            title="Manage your booking"
            description="View or reschedule from the My Bookings screen"
            left={props => <List.Icon {...props} icon="calendar-edit" color="#4CAF50" />}
          />
        </Card.Content>
      </Card>
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          icon="share-variant"
          onPress={handleShare}
          style={styles.shareButton}
        >
          Share Booking
        </Button>
        
        <Button 
          mode="contained" 
          icon="calendar-check"
          onPress={() => navigation.navigate('MyBookings')}
          style={styles.viewBookingsButton}
        >
          View My Bookings
        </Button>
        
        <Button 
          mode="outlined"
          onPress={() => navigation.navigate('Marketplace')}
          style={styles.marketplaceButton}
        >
          Back to Marketplace
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  animation: {
    width: 150,
    height: 150,
  },
  confirmationCard: {
    margin: 16,
    marginTop: 0,
    elevation: 3,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    color: '#4CAF50',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  listItem: {
    paddingVertical: 4,
  },
  blockchainInfoContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  blockchainIcon: {
    backgroundColor: '#4CAF50',
  },
  blockchainTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  blockchainTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  blockchainDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  transactionId: {
    fontSize: 12,
    color: '#888',
    fontFamily: 'monospace',
  },
  instructionsCard: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  buttonContainer: {
    padding: 16,
    paddingTop: 8,
  },
  shareButton: {
    marginBottom: 12,
    backgroundColor: '#5C6BC0',
  },
  viewBookingsButton: {
    marginBottom: 12,
  },
  marketplaceButton: {
    marginBottom: 20,
  },
});