import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Title, Card, Paragraph, List, Divider } from 'react-native-paper';

export default function HealthcareHomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>Healthcare Records</Title>
          <Paragraph style={styles.paragraph}>
            Secure, immutable healthcare records powered by IOTA blockchain
          </Paragraph>
        </Card.Content>
      </Card>
      
      <View style={styles.actionsContainer}>
        <Button 
          mode="contained" 
          icon="folder-multiple"
          style={styles.button}
          onPress={() => navigation.navigate('HealthcareList')}>
          View All Records
        </Button>
        
        <Button 
          mode="contained" 
          icon="file-document-plus"
          style={styles.button}
          onPress={() => navigation.navigate('AddHealthcareRecord')}>
          Add New Record
        </Button>
      </View>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Title>Available Record Types</Title>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Prescriptions"
            description="Medication prescriptions from healthcare providers"
            left={props => <List.Icon {...props} icon="pill" />}
            onPress={() => navigation.navigate('HealthcareList', { filter: 'Prescription' })}
          />
          
          <List.Item
            title="Lab Tests"
            description="Blood tests, urine analysis, and other laboratory results"
            left={props => <List.Icon {...props} icon="test-tube" />}
            onPress={() => navigation.navigate('HealthcareList', { filter: 'BloodTest' })}
          />
          
          <List.Item
            title="Vaccinations"
            description="Record of immunizations and vaccines"
            left={props => <List.Icon {...props} icon="needle" />}
            onPress={() => navigation.navigate('HealthcareList', { filter: 'Vaccination' })}
          />
          
          <List.Item
            title="Medical Reports"
            description="Doctor visit summaries and diagnosis reports"
            left={props => <List.Icon {...props} icon="file-document" />}
            onPress={() => navigation.navigate('HealthcareList', { filter: 'MedicalReport' })}
          />
        </Card.Content>
      </Card>
      
      <Card style={styles.benefitsCard}>
        <Card.Content>
          <Title>Benefits</Title>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Secure & Immutable"
            description="Records are secured by blockchain technology and cannot be altered"
            left={props => <List.Icon {...props} icon="shield-lock" />}
          />
          
          <List.Item
            title="Always Available"
            description="Access your medical records anytime, anywhere"
            left={props => <List.Icon {...props} icon="cloud" />}
          />
          
          <List.Item
            title="Complete History"
            description="Maintain a comprehensive medical history in one place"
            left={props => <List.Icon {...props} icon="history" />}
          />
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
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
  actionsContainer: {
    marginBottom: 20,
  },
  button: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  infoCard: {
    marginBottom: 16,
  },
  benefitsCard: {
    marginBottom: 20,
  },
  divider: {
    marginVertical: 10,
  },
});