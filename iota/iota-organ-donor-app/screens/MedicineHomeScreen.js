import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Button, Title, Card, Paragraph, List, Divider } from 'react-native-paper';

export default function MedicineHomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>Medicine Authentication System</Title>
          <Paragraph style={styles.paragraph}>
            Secure medicine verification and authentication powered by IOTA blockchain
          </Paragraph>
        </Card.Content>
      </Card>
      
      <View style={styles.actionsContainer}>
        <Button 
          mode="contained" 
          icon="barcode-scan"
          style={styles.button}
          onPress={() => navigation.navigate('VerifyMedicine')}>
          Verify Medicine
        </Button>
        
        <Button 
          mode="contained" 
          icon="pill"
          style={styles.button}
          onPress={() => navigation.navigate('MedicineList')}>
          View All Medicines
        </Button>
        
        <Button 
          mode="contained" 
          icon="plus-circle"
          style={styles.button}
          onPress={() => navigation.navigate('RegisterMedicine')}>
          Register New Medicine
        </Button>
      </View>

      <Card style={styles.infoCard}>
        <Card.Content>
          <Title>How It Works</Title>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Register"
            description="Manufacturers register medicine details on the blockchain"
            left={props => <List.Icon {...props} icon="database-plus" />}
          />
          
          <List.Item
            title="Verify"
            description="Consumers scan or enter the serial number to verify authenticity"
            left={props => <List.Icon {...props} icon="check-circle" />}
          />
          
          <List.Item
            title="Activate"
            description="First-time verification activates the medicine, preventing counterfeits"
            left={props => <List.Icon {...props} icon="shield-check" />}
          />
          
          <Paragraph style={styles.securityNote}>
            All data is stored securely on the IOTA Tangle, ensuring transparency and immutability.
          </Paragraph>
        </Card.Content>
      </Card>
      
      <Card style={styles.benefitsCard}>
        <Card.Content>
          <Title>Benefits</Title>
          <Divider style={styles.divider} />
          
          <List.Item
            title="Anti-Counterfeiting"
            description="Verify that your medicine is genuine before use"
            left={props => <List.Icon {...props} icon="shield-lock" />}
          />
          
          <List.Item
            title="Supply Chain Visibility"
            description="Track medicine from manufacturer to consumer"
            left={props => <List.Icon {...props} icon="truck-delivery" />}
          />
          
          <List.Item
            title="Recall Management"
            description="Quickly identify and alert about recalled medicines"
            left={props => <List.Icon {...props} icon="alert-circle" />}
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
  securityNote: {
    fontStyle: 'italic',
    marginTop: 16,
    textAlign: 'center',
  },
});