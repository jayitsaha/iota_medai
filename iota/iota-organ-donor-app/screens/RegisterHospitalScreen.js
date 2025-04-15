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
  Checkbox, 
  Switch, 
  Chip, 
  ActivityIndicator 
} from 'react-native-paper';
import * as Location from 'expo-location';
import { CONFIG } from '../config';

// API base URL
const API_URL = CONFIG.API_URL || 'http://localhost:3000/api';

const RegisterHospitalScreen = ({ navigation }) => {
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyCapacity, setEmergencyCapacity] = useState('0');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  
  // Services offered
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  
  // Available services to choose from
  const availableServices = [
    'Emergency Care',
    'General Medicine',
    'Surgery',
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Obstetrics',
    'Gynecology',
    'Neurology',
    'Oncology',
    'Radiology',
    'Laboratory',
    'Pharmacy',
    'Physical Therapy',
    'Mental Health',
  ];
  
  // Get current location when useCurrentLocation changes
  useEffect(() => {
    if (useCurrentLocation) {
      getCurrentLocation();
    }
  }, [useCurrentLocation]);
  
  // Get current location
  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Location permission not granted');
        setUseCurrentLocation(false);
        setLocationLoading(false);
        return;
      }
      
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLatitude(location.coords.latitude.toString());
      setLongitude(location.coords.longitude.toString());
      
      // Try to get address from coordinates
      try {
        const [addressInfo] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (addressInfo) {
          setAddress(addressInfo.street || '');
          setCity(addressInfo.city || '');
          setState(addressInfo.region || '');
          setCountry(addressInfo.country || '');
          setPostalCode(addressInfo.postalCode || '');
        }
      } catch (error) {
        console.error('Error getting address from location:', error);
      }
    } catch (error) {
      setLocationError('Error getting location: ' + error.message);
      setUseCurrentLocation(false);
    } finally {
      setLocationLoading(false);
    }
  };
  
  // Add service
  const addService = () => {
    if (newService && !services.includes(newService)) {
      setServices([...services, newService]);
      setNewService('');
    }
  };
  
  // Toggle predefined service
  const toggleService = (service) => {
    if (services.includes(service)) {
      setServices(services.filter(s => s !== service));
    } else {
      setServices([...services, service]);
    }
  };
  
  // Remove service
  const removeService = (service) => {
    setServices(services.filter(s => s !== service));
  };
  
  // Validate form
  const validateForm = () => {
    if (!name) {
      Alert.alert('Error', 'Hospital name is required');
      return false;
    }
    
    if (!address || !city || !country) {
      Alert.alert('Error', 'Hospital address is required');
      return false;
    }
    
    if (!latitude || !longitude) {
      Alert.alert('Error', 'Hospital coordinates are required');
      return false;
    }
    
    if (!phone) {
      Alert.alert('Error', 'Contact phone is required');
      return false;
    }
    
    return true;
  };
  
  // Submit hospital registration
  const registerHospital = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      // Prepare hospital data
      const hospitalData = {
        name,
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          address,
          city,
          state,
          country,
          postal_code: postalCode,
        },
        contact: {
          phone,
          email,
          website,
          emergency_phone: emergencyPhone || phone,
        },
        services,
        emergency_capacity: parseInt(emergencyCapacity, 10) || 0,
      };


      console.log('Submitting hospital data:', hospitalData);
      
      // Submit to API
      const response = await fetch(`${API_URL}/hospitals`, {
        method: 'POST',
        headers: {
          'user-id': 'demo-user', // Replace with actual user ID
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hospitalData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Hospital registered successfully on IOTA blockchain',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('HospitalList'),
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error registering hospital:', error);
      Alert.alert('Error', error.message || 'Failed to register hospital');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <Title style={styles.title}>Register Hospital on IOTA</Title>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Hospital Information</Text>
          
          <TextInput
            label="Hospital Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
          />
          
          <View style={styles.locationSwitch}>
            <Text>Use Current Location</Text>
            <Switch
              value={useCurrentLocation}
              onValueChange={setUseCurrentLocation}
            />
          </View>
          
          {locationLoading && (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color="#6200ee" />
              <Text style={styles.locationLoadingText}>Getting location...</Text>
            </View>
          )}
          
          {locationError && (
            <Text style={styles.errorText}>{locationError}</Text>
          )}
          
          <View style={styles.coordinatesContainer}>
            <TextInput
              label="Latitude"
              value={latitude}
              onChangeText={setLatitude}
              style={[styles.input, styles.coordinateInput]}
              mode="outlined"
              keyboardType="numeric"
              disabled={useCurrentLocation}
            />
            <TextInput
              label="Longitude"
              value={longitude}
              onChangeText={setLongitude}
              style={[styles.input, styles.coordinateInput]}
              mode="outlined"
              keyboardType="numeric"
              disabled={useCurrentLocation}
            />
          </View>
          
          <TextInput
            label="Street Address"
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            mode="outlined"
            disabled={useCurrentLocation}
          />
          
          <View style={styles.rowContainer}>
            <TextInput
              label="City"
              value={city}
              onChangeText={setCity}
              style={[styles.input, styles.rowInput]}
              mode="outlined"
              disabled={useCurrentLocation}
            />
            <TextInput
              label="State/Province"
              value={state}
              onChangeText={setState}
              style={[styles.input, styles.rowInput]}
              mode="outlined"
              disabled={useCurrentLocation}
            />
          </View>
          
          <View style={styles.rowContainer}>
            <TextInput
              label="Country"
              value={country}
              onChangeText={setCountry}
              style={[styles.input, styles.rowInput]}
              mode="outlined"
              disabled={useCurrentLocation}
            />
            <TextInput
              label="Postal Code"
              value={postalCode}
              onChangeText={setPostalCode}
              style={[styles.input, styles.rowInput]}
              mode="outlined"
              disabled={useCurrentLocation}
            />
          </View>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <TextInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
          />
          
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            mode="outlined"
            keyboardType="email-address"
          />
          
          <TextInput
            label="Website"
            value={website}
            onChangeText={setWebsite}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Emergency Contact Number"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            style={styles.input}
            mode="outlined"
            keyboardType="phone-pad"
            placeholder="If different from main phone"
          />
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Emergency Services</Text>
          
          <TextInput
            label="Emergency Capacity (beds)"
            value={emergencyCapacity}
            onChangeText={setEmergencyCapacity}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          
          <View style={styles.servicesContainer}>
            {availableServices.map((service) => (
              <Chip
                key={service}
                selected={services.includes(service)}
                onPress={() => toggleService(service)}
                style={styles.serviceChip}
                mode={services.includes(service) ? "flat" : "outlined"}
              >
                {service}
              </Chip>
            ))}
          </View>
          
          <View style={styles.addServiceContainer}>
            <TextInput
              label="Add Custom Service"
              value={newService}
              onChangeText={setNewService}
              style={styles.serviceInput}
              mode="outlined"
            />
            <Button 
              onPress={addService} 
              mode="contained"
              style={styles.addButton}
              disabled={!newService}
            >
              Add
            </Button>
          </View>
          
          {services.length > 0 && (
            <View style={styles.selectedServicesContainer}>
              <Text style={styles.selectedServicesTitle}>Selected Services:</Text>
              <View style={styles.selectedServices}>
                {services.map((service) => (
                  <Chip
                    key={service}
                    onClose={() => removeService(service)}
                    style={styles.selectedChip}
                    mode="flat"
                  >
                    {service}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={registerHospital}
            style={styles.button}
            loading={loading}
            disabled={loading}
          >
            Register Hospital on IOTA
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
            disabled={loading}
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
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  locationSwitch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationLoadingText: {
    marginLeft: 8,
    color: '#666',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coordinateInput: {
    flex: 1,
    marginHorizontal: 4,
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 16,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  serviceChip: {
    margin: 4,
  },
  addServiceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceInput: {
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    justifyContent: 'center',
  },
  selectedServicesContainer: {
    marginTop: 8,
  },
  selectedServicesTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  selectedServices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedChip: {
    margin: 4,
    backgroundColor: '#e0e0ff',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
  button: {
    marginBottom: 16,
    paddingVertical: 8,
  },
});

export default RegisterHospitalScreen;