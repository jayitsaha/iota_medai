import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Title, Card, Paragraph } from 'react-native-paper';

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>IOTA Organ Donor Registry</Title>
          <Paragraph style={styles.paragraph}>
            Secure and transparent organ donation registry using IOTA blockchain technology
          </Paragraph>
        </Card.Content>
      </Card>
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          style={styles.button}
          onPress={() => navigation.navigate('AddDonor')}>
          Register New Donor
        </Button>
        
        <Button 
          mode="contained" 
          style={styles.button}
          onPress={() => navigation.navigate('ViewRecords')}>
          View Donor Records
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  paragraph: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    marginBottom: 16,
    paddingVertical: 8,
  },
});