import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import {
  TextInput,
  Button,
  Headline,
  Paragraph,
  Card,
  Divider,
  HelperText,
  Subheading,
  Menu,
  Portal,
  Dialog,
  ActivityIndicator,
  Text
} from 'react-native-paper';
import { addService, updateService } from '../services/marketplaceService';
import { useWallet } from '../services/walletService';

export default function AddServiceScreen({ navigation, route }) {
  // Get any existing service data if editing
  const editingService = route.params?.service;
  const isEditing = !!editingService;

  // Form state
  const [title, setTitle] = useState(editingService?.title || '');
  const [description, setDescription] = useState(editingService?.description || '');
  const [price, setPrice] = useState(editingService?.price?.toString() || '');
  const [category, setCategory] = useState(editingService?.category || 'consultations');
  const [categoryName, setCategoryName] = useState(editingService?.categoryName || 'Remote Consultations');
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Additional fields for service details
  const [duration, setDuration] = useState(editingService?.duration || '60 minutes');
  const [location, setLocation] = useState(editingService?.location || 'Video Call');
  const [credentials, setCredentials] = useState(editingService?.providerCredentials || '');
  const [features, setFeatures] = useState(editingService?.features?.join('\n') || '');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successDialogVisible, setSuccessDialogVisible] = useState(false);
  
  // Get wallet for provider address
  const { address } = useWallet();
  
  // Category options
  const categories = [
    { id: 'consultations', name: 'Remote Consultations' },
    { id: 'homecare', name: 'Home Care' },
    { id: 'prenatal', name: 'Prenatal Services' },
    { id: 'wellness', name: 'Wellness' },
    { id: 'therapy', name: 'Therapy' }
  ];

  // Form validation
  const validateForm = () => {
    if (!title) {
      setError('Service title is required');
      return false;
    }
    
    if (!description) {
      setError('Description is required');
      return false;
    }
    
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('Please enter a valid price');
      return false;
    }
    
    if (!credentials) {
      setError('Professional credentials are required');
      return false;
    }
    
    return true;
  };

  // Handle submit
  const handleSubmit = async () => {
    try {
      // Clear previous errors
      setError(null);
      
      // Validate form
      if (!validateForm()) {
        return;
      }
      
      setLoading(true);
      
      // Prepare service data
      const serviceData = {
        title,
        description,
        price: Number(price),
        category,
        duration,
        location,
        features: features.split('\n').filter(f => f.trim() !== ''),
        providerCredentials: credentials
      };
      
      let response;
      
      if (isEditing) {
        // Update existing service
        response = await updateService(editingService.id, serviceData);
      } else {
        // Create new service
        response = await addService(serviceData);
      }
      
      setLoading(false);
      
      if (response.success) {
        setSuccessDialogVisible(true);
      } else {
        setError(response.error || 'Failed to save service');
      }
    } catch (err) {
      console.error('Error saving service:', err);
      setLoading(false);
      setError('An unexpected error occurred. Please try again.');
    }
  };
  
  // Handle category selection
  const selectCategory = (categoryId) => {
    setCategory(categoryId);
    const selectedCategory = categories.find(c => c.id === categoryId);
    setCategoryName(selectedCategory?.name || '');
    setMenuVisible(false);
    
    // Set default location and duration based on category
    if (categoryId === 'consultations') {
      setLocation('Video Call');
      setDuration('45 minutes');
    } else if (categoryId === 'homecare') {
      setLocation('Your Home');
      setDuration('2 hours');
    } else if (categoryId === 'prenatal') {
      setLocation('Provider\'s Clinic');
      setDuration('1 hour');
    } else if (categoryId === 'therapy') {
      setLocation('Provider\'s Office');
      setDuration('50 minutes');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.formCard}>
          <Card.Content>
            <Headline style={styles.headline}>
              {isEditing ? 'Edit Healthcare Service' : 'Add Healthcare Service'}
            </Headline>
            
            <Paragraph style={styles.paragraph}>
              Provide the details of your healthcare service. All services are secured with IOTA blockchain technology.
            </Paragraph>
            
            <Divider style={styles.divider} />
            
            <Subheading style={styles.subheading}>Basic Information</Subheading>
            
            <TextInput
              label="Service Title"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              mode="outlined"
              error={!title && error}
              placeholder="e.g., Remote Neurological Consultation"
            />
            
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TextInput
                  label="Category"
                  value={categoryName}
                  onFocus={() => setMenuVisible(true)}
                  style={styles.input}
                  mode="outlined"
                  right={<TextInput.Icon name="menu-down" onPress={() => setMenuVisible(true)} />}
                />
              }
            >
              {categories.map((cat) => (
                <Menu.Item 
                  key={cat.id} 
                  onPress={() => selectCategory(cat.id)} 
                  title={cat.name} 
                />
              ))}
            </Menu>
            
            <TextInput
              label="Price (MEDAI tokens)"
              value={price}
              onChangeText={setPrice}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
              error={(!price || isNaN(Number(price)) || Number(price) <= 0) && error}
              placeholder="e.g., 150"
            />
            
            <TextInput
              label="Description"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={4}
              error={!description && error}
              placeholder="Describe your service and what patients can expect"
            />
            
            <Divider style={styles.divider} />
            
            <Subheading style={styles.subheading}>Service Details</Subheading>
            
            <TextInput
              label="Professional Credentials"
              value={credentials}
              onChangeText={setCredentials}
              style={styles.input}
              mode="outlined"
              error={!credentials && error}
              placeholder="e.g., Board Certified Neurologist, MD"
            />
            
            <TextInput
              label="Duration"
              value={duration}
              onChangeText={setDuration}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., 60 minutes"
            />
            
            <TextInput
              label="Location"
              value={location}
              onChangeText={setLocation}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., Video Call, Your Home, Provider's Clinic"
            />
            
            <TextInput
              label="Features (one per line)"
              value={features}
              onChangeText={setFeatures}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={4}
              placeholder="e.g., 24/7 support via messaging&#10;Follow-up consultation included"
            />
            
            {error && (
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
            )}
            
            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => navigation.goBack()} 
                style={styles.button}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                onPress={handleSubmit} 
                style={styles.button}
                loading={loading}
                disabled={loading}
              >
                {isEditing ? 'Update Service' : 'Add Service'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
      
      <Portal>
        <Dialog
          visible={successDialogVisible}
          onDismiss={() => {
            setSuccessDialogVisible(false);
            navigation.navigate('MyServices');
          }}
        >
          <Dialog.Title>Success</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              {isEditing 
                ? 'Your service has been updated successfully.' 
                : 'Your service has been added successfully and recorded on the blockchain.'}
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button 
              onPress={() => {
                setSuccessDialogVisible(false);
                navigation.navigate('MyServices');
              }}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    marginBottom: 16,
  },
  headline: {
    textAlign: 'center',
    marginBottom: 8,
  },
  paragraph: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  divider: {
    marginVertical: 16,
  },
  subheading: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
});