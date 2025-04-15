import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Title, Card, Paragraph, Text, Divider, TextInput, Rating } from 'react-native-paper';
import { AirbnbRating } from 'react-native-ratings';
import { submitServiceRating } from '../services/marketplaceService';

export default function RateServiceScreen({ route, navigation }) {
  const { bookingId, serviceTitle } = route.params;
  const [rating, setRating] = useState(3);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitRating = async () => {
    if (rating === 0) {
      Alert.alert('Missing Rating', 'Please provide a star rating');
      return;
    }

    try {
      setSubmitting(true);
      
      // Call API to submit rating
      await submitServiceRating(bookingId, rating, feedback);
      
      // Show success message
      Alert.alert(
        'Thank You!',
        'Your feedback has been recorded successfully',
        [{ text: 'OK', onPress: () => navigation.navigate('MyBookings') }]
      );
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Rate Your Experience</Title>
          <Paragraph style={styles.subtitle}>
            Service: {serviceTitle}
          </Paragraph>
          
          <Divider style={styles.divider} />
          
          <Text style={styles.ratingLabel}>How would you rate this service?</Text>
          
          <View style={styles.ratingContainer}>
            <AirbnbRating
              count={5}
              defaultRating={rating}
              size={30}
              showRating={false}
              onFinishRating={(value) => setRating(value)}
            />
            <Text style={styles.ratingText}>
              {rating === 1 ? 'Poor' :
               rating === 2 ? 'Fair' :
               rating === 3 ? 'Good' :
               rating === 4 ? 'Very Good' :
               rating === 5 ? 'Excellent' : ''}
            </Text>
          </View>
          
          <TextInput
            label="Additional Feedback (Optional)"
            value={feedback}
            onChangeText={setFeedback}
            mode="outlined"
            multiline
            numberOfLines={5}
            style={styles.feedbackInput}
          />
          
          <Text style={styles.infoText}>
            Your feedback helps improve healthcare services and will be stored securely on the IOTA blockchain.
          </Text>
        </Card.Content>
      </Card>
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()} 
          style={styles.cancelButton}
        >
          Cancel
        </Button>
        <Button 
          mode="contained" 
          onPress={handleSubmitRating}
          loading={submitting}
          disabled={submitting}
          style={styles.submitButton}
        >
          Submit Rating
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
  card: {
    margin: 16,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  ratingLabel: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  feedbackInput: {
    marginBottom: 16,
  },
  infoText: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
  },
});