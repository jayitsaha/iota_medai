import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import {
  TextInput,
  Button,
  Title,
  Chip,
  ActivityIndicator,
  Divider,
  HelperText
} from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG.API_URL || 'http://localhost:3000/api';

const AddAmbulanceScreen = ({ route, navigation }) => {
  const { hospitalId, hospitalName } = route.params || {};
  
  // Form state
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Basic');
  const [capacity, setCapacity] = useState('1');
  const [equipment, setEquipment] = useState([]);
  const [newEquipment, setNewEquipment] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hospital, setHospital] = useState(null);
  
  // Vehicle type options
  const vehicleTypes = [
    'Basic',
    'Advanced Life Support',
    'Mobile ICU',
    'Neonatal',
    'Bariatric'
  ];
  
  // Common medical equipment
  const commonEquipment = [
    'Defibrillator',
    'Oxygen',
    'Stretcher',
    'First Aid Kit',
    'ECG Monitor',
    'Ventilator',
    'Blood Pressure Monitor',
    'Suction Device',
    'IV Equipment',
    'Medications',
    'Splints',
    'Cervical Collar'
  ];
  
  // Fetch hospital details
  useEffect(() => {
    if (hospitalId) {
      fetchHospitalDetails();
    }
  }, [hospitalId]);
  
  const fetchHospitalDetails = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/hospitals/${hospitalId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch hospital details');
      }
      
      const hospitalData = await response.json();
      setHospital(hospitalData);
    } catch (error) {
      console.error('Error fetching hospital details:', error);
      Alert.alert('Error', 'Failed to fetch hospital details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };
  
  // Add equipment
  const addEquipment = () => {
    if (newEquipment && !equipment.includes(newEquipment)) {
      setEquipment([...equipment, newEquipment]);
      setNewEquipment('');
    }
  };
  
  // Toggle equipment
  const toggleEquipment = (item) => {
    if (equipment.includes(item)) {
      setEquipment(equipment.filter((e) => e !== item));
    } else {
      setEquipment([...equipment, item]);
    }
  };
  
  // Remove equipment
  const removeEquipment = (item) => {
    setEquipment(equipment.filter((e) => e !== item));
  };
  
  // Validate form
  const validateForm = () => {
    if (!registrationNumber) {
      Alert.alert('Error', 'Registration number is required');
      return false;
    }
    
    if (!vehicleType) {
      Alert.alert('Error', 'Vehicle type is required');
      return false;
    }
    
    return true;
  };
  
  // Submit ambulance registration
  const registerAmbulance = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      // Prepare ambulance data
      const ambulanceData = {
        registration_number: registrationNumber,
        vehicle_type: vehicleType,
        capacity: parseInt(capacity, 10) || 1,
        equipment
      };
      
      // Submit to API
      const response = await fetch(`${API_URL}/hospitals/${hospitalId}/ambulances`, {
        method: 'POST',
        headers: {
          'user-id': 'demo-user', // Replace with actual user ID
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ambulanceData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Ambulance registered successfully on IOTA blockchain',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('HospitalDetails', { hospitalId })
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error registering ambulance:', error);
      Alert.alert('Error', error.message || 'Failed to register ambulance');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading hospital details...</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <Title style={styles.title}>Add Ambulance</Title>
        
        <View style={styles.hospitalInfo}>
          <MaterialIcons name="local-hospital" size={24} color="#6200ee" />
          <Text style={styles.hospitalName}>
            {hospital?.name || hospitalName || 'Hospital'}
          </Text>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Ambulance Details</Text>
          
          <TextInput
            label="Registration Number"
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            style={styles.input}
            mode="outlined"
            placeholder="e.g., AMB-1234"
          />
          <HelperText type="info">Official registration or license number</HelperText>
          
          <Text style={styles.fieldLabel}>Vehicle Type</Text>
          <View style={styles.chipsContainer}>
            {vehicleTypes.map((type) => (
              <Chip
                key={type}
                selected={vehicleType === type}
                onPress={() => setVehicleType(type)}
                style={styles.typeChip}
                mode={vehicleType === type ? "flat" : "outlined"}
              >
                {type}
              </Chip>
            ))}
          </View>
          
          <TextInput
            label="Capacity (persons)"
            value={capacity}
            onChangeText={setCapacity}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
          />
          <HelperText type="info">Maximum number of patients that can be transported</HelperText>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Equipment</Text>
          
          <Text style={styles.fieldLabel}>Common Equipment</Text>
          <View style={styles.chipsContainer}>
            {commonEquipment.map((item) => (
              <Chip
                key={item}
                selected={equipment.includes(item)}
                onPress={() => toggleEquipment(item)}
                style={styles.equipmentChip}
                mode={equipment.includes(item) ? "flat" : "outlined"}
              >
                {item}
              </Chip>
            ))}
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.addEquipmentContainer}>
            <TextInput
              label="Add Custom Equipment"
              value={newEquipment}
              onChangeText={setNewEquipment}
              style={styles.equipmentInput}
              mode="outlined"
            />
            <Button
              onPress={addEquipment}
              mode="contained"
              style={styles.addButton}
              disabled={!newEquipment}
            >
              Add
            </Button>
          </View>
          
          {equipment.length > 0 && (
            <View style={styles.selectedEquipmentContainer}>
              <Text style={styles.selectedEquipmentTitle}>Selected Equipment:</Text>
              <View style={styles.selectedEquipment}>
                {equipment.map((item) => (
                  <Chip
                    key={item}
                    onClose={() => removeEquipment(item)}
                    style={styles.selectedChip}
                    mode="flat"
                  >
                    {item}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={registerAmbulance}
            style={styles.button}
            loading={submitting}
            disabled={submitting}
          >
            Register Ambulance on IOTA
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
            disabled={submitting}
          >
            Cancel
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  scrollView: {
    flex: 1,
    padding: 16
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center'
  },
  hospitalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24
  },
  hospitalName: {
    fontSize: 18,
    marginLeft: 8,
    color: '#333'
  },
  formSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#f9f9f9'
  },
  fieldLabel: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    color: '#555'
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16
  },
  typeChip: {
    margin: 4
  },
  equipmentChip: {
    margin: 4
  },
  divider: {
    marginVertical: 16
  },
  addEquipmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  equipmentInput: {
    flex: 1,
    marginRight: 8
  },
  addButton: {
    justifyContent: 'center'
  },
  selectedEquipmentContainer: {
    marginTop: 8
  },
  selectedEquipmentTitle: {
    fontSize: 14,
    marginBottom: 8
  },
  selectedEquipment: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  selectedChip: {
    margin: 4,
    backgroundColor: '#e0e0ff'
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32
  },
  button: {
    marginBottom: 16,
    paddingVertical: 8
  }
});

export default AddAmbulanceScreen;