import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import { CONFIG } from '../config';

const API_URL = CONFIG?.API_URL || 'http://localhost:3000/api';

const HospitalRegisterScreen = ({ navigation }) => {
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postal_code, setpostal_code] = useState('');
  const [country, setCountry] = useState('India');
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [emergencyCapacity, setEmergencyCapacity] = useState('10');
  const [services, setServices] = useState([]);
  
  // Service options
  const serviceOptions = [
    { id: 'emergency', label: 'Emergency Services', selected: true },
    { id: 'ambulance', label: 'Ambulance Services', selected: true },
    { id: 'icu', label: 'ICU', selected: false },
    { id: 'surgery', label: 'Surgery', selected: false },
    { id: 'organ_donor', label: 'Organ Donor Management', selected: false },
    { id: 'cardiology', label: 'Cardiology', selected: false },
    { id: 'neurology', label: 'Neurology', selected: false },
    { id: 'pediatrics', label: 'Pediatrics', selected: false },
  ];
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: Location, 3: Services

  // Initialize services from options
  useEffect(() => {
    setServices(serviceOptions.filter(service => service.selected).map(service => service.id));
  }, []);

  // Get location permission and current coordinates
  useEffect(() => {
    const getLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location Permission Required',
            'Please grant location permission to automatically detect your hospital location.'
          );
          return;
        }
      } catch (err) {
        console.error('Error requesting location permission:', err);
      }
    };

    getLocationPermission();
  }, []);

  // Handle service selection
  const toggleService = (serviceId) => {
    if (services.includes(serviceId)) {
      setServices(services.filter(id => id !== serviceId));
    } else {
      setServices([...services, serviceId]);
    }
  };

  // Get current location
  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to detect your hospital location.'
        );
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      // Try to get the address from coordinates (reverse geocoding)
      const [addressInfo] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (addressInfo) {
        setAddress(addressInfo.street || '');
        setCity(addressInfo.city || '');
        setState(addressInfo.region || '');
        setpostal_code(addressInfo.postalCode || '');
        setCountry(addressInfo.country || 'India');
      }

      setLocationLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationLoading(false);
      Alert.alert('Location Error', 'Failed to get current location. Please enter manually.');
    }
  };

  // Handle registration form submission
  const handleRegister = async () => {
    try {
      // Validate form data
      if (!name || !email || !password || !phone || !address || !city || !state) {
        setError('Please fill in all required fields');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!coordinates.latitude || !coordinates.longitude) {
        setError('Location coordinates are required. Please use the detect location button.');
        return;
      }

      if (services.length === 0) {
        setError('Please select at least one service that your hospital provides');
        return;
      }

      setLoading(true);
      setError(null);

      // Prepare registration data
      const hospitalData = {
        name,
        email,
        password,
        location: {
          address,
          city,
          state,
          postal_code,
          country,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        },
        contact: {
          email,
          phone,
          website: '',
          emergency_phone: '',
        },
        services,
        emergency_capacity: parseInt(emergencyCapacity) || 0
      };

      console.log(hospitalData)

      // Make API call to register endpoint
      const response = await fetch(`${API_URL}/hospitals`, {
        method: 'POST',
        headers: {
          'user-id': 'demo-user', // Replace with actual user ID
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(hospitalData),
      });

      // Show success and navigate to login
      Alert.alert(
        'Registration Successful',
        'Your hospital has been registered and will be verified shortly. You can now login to your account.',
        [
          {
            text: 'Login Now',
            onPress: () => navigation.navigate('HospitalLogin')
          }
        ]
      );
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Registration failed. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Navigate to next step
  const nextStep = () => {
    // Validate current step
    if (step === 1) {
      if (!name || !email || !password || !confirmPassword) {
        setError('Please fill in all required fields');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    } else if (step === 2) {
      if (!address || !city || !state) {
        setError('Please fill in all required location fields');
        return;
      }
    }
    
    setError(null);
    setStep(step + 1);
  };

  // Navigate to previous step
  const prevStep = () => {
    setError(null);
    setStep(step - 1);
  };

  // Render step 1 - Basic hospital information
  const renderBasicInfoStep = () => (
    <View style={styles.formSection}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Hospital Name *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="business-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter hospital name"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email Address *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Password *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Confirm Password *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>
      </View>
    </View>
  );

  // Render step 2 - Location information
  const renderLocationStep = () => (
    <View style={styles.formSection}>
      <Text style={styles.stepTitle}>Hospital Location</Text>
      
      <TouchableOpacity
        style={styles.detectLocationButton}
        onPress={getCurrentLocation}
        disabled={locationLoading}
      >
        {locationLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="location" size={20} color="#FFFFFF" />
            <Text style={styles.detectLocationText}>Detect Location</Text>
          </>
        )}
      </TouchableOpacity>
      
      <View style={styles.coordinatesContainer}>
        <Text style={styles.coordinatesLabel}>Coordinates:</Text>
        <Text style={styles.coordinatesValue}>
          {coordinates.latitude && coordinates.longitude
            ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
            : 'Not detected'}
        </Text>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Address *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="home-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter street address"
            placeholderTextColor="#94A3B8"
            value={address}
            onChangeText={setAddress}
          />
        </View>
      </View>
      
      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>City *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor="#94A3B8"
              value={city}
              onChangeText={setCity}
            />
          </View>
        </View>
        
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.inputLabel}>State *</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="State"
              placeholderTextColor="#94A3B8"
              value={state}
              onChangeText={setState}
            />
          </View>
        </View>
      </View>
      
      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={styles.inputLabel}>Postal Code</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Postal code"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={postal_code}
              onChangeText={setpostal_code}
            />
          </View>
        </View>
        
        <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
          <Text style={styles.inputLabel}>Country</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Country"
              placeholderTextColor="#94A3B8"
              value={country}
              onChangeText={setCountry}
            />
          </View>
        </View>
      </View>
    </View>
  );

  // Render step 3 - Services information
  const renderServicesStep = () => (
    <View style={styles.formSection}>
      <Text style={styles.stepTitle}>Hospital Services</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Emergency Capacity</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="bed-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Number of emergency beds"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={emergencyCapacity}
            onChangeText={setEmergencyCapacity}
          />
        </View>
      </View>
      
      <Text style={styles.sectionSubtitle}>Available Services *</Text>
      <Text style={styles.helperText}>Select all services that your hospital provides</Text>
      
      <View style={styles.servicesContainer}>
        {serviceOptions.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceItem,
              services.includes(service.id) && styles.serviceItemSelected
            ]}
            onPress={() => toggleService(service.id)}
          >
            <View style={styles.serviceCheckbox}>
              {services.includes(service.id) && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.serviceLabel}>{service.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (step > 1) {
              prevStep();
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hospital Registration</Text>
        <View style={styles.headerRight} />
      </View>
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Steps Indicator */}
          <View style={styles.stepsContainer}>
            {[1, 2, 3].map((stepNumber) => (
              <View key={stepNumber} style={styles.stepIndicatorContainer}>
                <View
                  style={[
                    styles.stepIndicator,
                    stepNumber <= step && styles.stepIndicatorActive
                  ]}
                >
                  <Text
                    style={[
                      styles.stepIndicatorText,
                      stepNumber <= step && styles.stepIndicatorTextActive
                    ]}
                  >
                    {stepNumber}
                  </Text>
                </View>
                {stepNumber < 3 && <View style={styles.stepConnector} />}
              </View>
            ))}
          </View>
          
          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#E57373" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {/* Form Steps */}
          {step === 1 && renderBasicInfoStep()}
          {step === 2 && renderLocationStep()}
          {step === 3 && renderServicesStep()}
          
          {/* Navigation Buttons */}
          <View style={styles.buttonsContainer}>
            {step > 1 && (
              <TouchableOpacity
                style={[styles.button, styles.prevButton]}
                onPress={prevStep}
              >
                <Ionicons name="arrow-back" size={20} color="#4A6FA5" />
                <Text style={styles.prevButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            {step < 3 ? (
              <TouchableOpacity
                style={[styles.button, styles.nextButton, step === 1 && styles.fullWidthButton]}
                onPress={nextStep}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.registerButton]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.registerButtonText}>Register Hospital</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={styles.loginLinkContainer}
            onPress={() => navigation.navigate('HospitalLogin')}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLink}>Login</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  headerRight: {
    width: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepIndicatorActive: {
    backgroundColor: '#4A6FA5',
    borderColor: '#4A6FA5',
  },
  stepIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  stepIndicatorTextActive: {
    color: '#FFFFFF',
  },
  stepConnector: {
    width: 40,
    height: 1,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#E57373',
    marginLeft: 8,
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 8,
    marginTop: 16,
  },
  helperText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 56,
  },
  inputIcon: {
    marginHorizontal: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#0F172A',
    fontSize: 16,
  },
  detectLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A6FA5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detectLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  coordinatesLabel: {
    fontSize: 14,
    color: '#64748B',
    marginRight: 8,
  },
  coordinatesValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  servicesContainer: {
    marginTop: 8,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  serviceItemSelected: {
    backgroundColor: '#F1F9FF',
  },
  serviceCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceLabel: {
    flex: 1,
    fontSize: 16,
    color: '#334155',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 14,
    flex: 1,
  },
  prevButton: {
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  prevButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A6FA5',
    marginLeft: 8,
  },
  nextButton: {
    backgroundColor: '#4A6FA5',
    marginLeft: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginRight: 8,
  },
  fullWidthButton: {
    marginLeft: 0,
  },
  registerButton: {
    backgroundColor: '#4A6FA5',
    justifyContent: 'center',
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loginLinkContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#64748B',
  },
  loginLink: {
    color: '#4A6FA5',
    fontWeight: '600',
  },
});

export default HospitalRegisterScreen;