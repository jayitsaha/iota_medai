import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  StatusBar,
  Alert 
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import the SmartBottomTabNavigator
import DynamicBottomTabNavigator from './navigation/DynamicBottomTabNavigator';
import PregnancyBottomTabNavigator from './navigation/PregnancyBottomTabNavigator';

// Persona Selection Screen
import PersonaSelectionScreen from './screens/onboarding/PersonaSelectionScreen';

// Login Screen
import LoginScreen from './screens/LoginScreen';

// Alzheimer's Screens
import AlzheimersHomeScreen from './screens/alzheimers/HomeScreen';
import MedicationScreen from './screens/alzheimers/MedicationScreen';
import SafeZoneScreen from './screens/alzheimers/SafeZoneScreen';

// New Blockchain-powered Screens
import HealthRecordsScreen from './screens/alzheimers/HealthRecordsScreen';
import MedicineAuthScreen from './screens/alzheimers/MedicineAuthScreen';
import OrganDonationScreen from './screens/alzheimers/OrganDonationScreen';
// import ProfileScreen from './screens/alzheimers/ProfileScreen';

// Marketplace and Wallet Screens
import MarketplaceScreen from './screens/marketplace/MarketplaceScreen';
import ServiceDetailsScreen from './screens/marketplace/ServiceDetailsScreen';
import MyBookingsScreen from './screens/marketplace/MyBookingsScreen';
import WalletScreen from './screens/wallet/WalletScreen';

// Pregnancy Screens
import PregnancyHomeScreen from './screens/pregnancy/HomeScreen';
import YogaScreen from './screens/pregnancy/YogaScreen';
import ChatbotScreen from './screens/pregnancy/ChatbotScreen';
import DietScreen from './screens/pregnancy/DietScreen';
import AppointmentScreen from './screens/pregnancy/AppointmentScreen';

// Common Services
import FallDetectionService from './services/FallDetectionService';
import { setupNotifications } from './services/NotificationService';

// Provider
import { WalletProvider } from './services/walletService'; 

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const RootStack = createStackNavigator();

// Define a common stack for any additional screens that need to be accessible
// from the SmartBottomTabNavigator but aren't part of the primary navigation
const CommonStack = createStackNavigator();

const CommonStackNavigator = ({ navigation, logoutHandler }) => {
  return (
    <CommonStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#6A5ACD' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerRight: () => (
          <TouchableOpacity 
            style={{ marginRight: 15 }}
            onPress={() => {
              Alert.alert(
                "Logout",
                "Are you sure you want to logout?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Logout", onPress: () => logoutHandler() }
                ]
              );
            }}
          >
            <Ionicons name="log-out-outline" size={24} color="white" />
          </TouchableOpacity>
        )
      }}
    >
      <CommonStack.Screen 
        name="ServiceDetails" 
        component={ServiceDetailsScreen} 
        options={{ title: 'Service Details' }} 
      />
      <CommonStack.Screen 
        name="MyBookings" 
        component={MyBookingsScreen} 
        options={{ title: 'My Bookings' }} 
      />
    </CommonStack.Navigator>
  );
};

// Configure the Alzheimer's Smart Navigation
const AlzheimersSmartNavigator = ({ logoutHandler }) => {
  // Define all screens available in the Alzheimer's persona
  const alzheimersScreens = {
    // Primary tabs
    Home: AlzheimersHomeScreen,
    Profile: props => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, marginBottom: 20 }}>Profile Screen</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#6A5ACD', padding: 15, borderRadius: 8 }}
          onPress={() => {
            Alert.alert(
              "Logout",
              "Are you sure you want to logout?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", onPress: () => logoutHandler() }
              ]
            );
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    ),
    
    // Health group
    Medication: MedicationScreen,
    HealthRecords: HealthRecordsScreen,
    MedicineAuth: MedicineAuthScreen,
    
    // Safety group
    SafeZone: SafeZoneScreen,
    Contacts: props => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18 }}>Emergency Contacts Screen</Text>
      </View>
    ),
    FallDetection: props => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18 }}>Fall Detection Settings</Text>
      </View>
    ),
    
    // More group
    Marketplace: MarketplaceScreen,
    Wallet: WalletScreen,
    OrganDonation: OrganDonationScreen,
    Journal: props => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18 }}>Memory Journal Screen</Text>
      </View>
    ),
    
    // Common screens
    ServiceDetails: ServiceDetailsScreen,
    MyBookings: MyBookingsScreen,
  };

  return (
    <DynamicBottomTabNavigator 
      screens={alzheimersScreens}
      logoutHandler={logoutHandler}
    />
  );
};

// Configure the Pregnancy persona navigation using PregnancyBottomTabNavigator
const PregnancySmartNavigator = ({ logoutHandler }) => {
  // Define all screens available in the pregnancy persona
  const pregnancyScreens = {
    // Primary tabs
    Home: PregnancyHomeScreen,
    Profile: props => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, marginBottom: 20 }}>Profile Screen</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#FF69B4', padding: 15, borderRadius: 8 }}
          onPress={() => {
            Alert.alert(
              "Logout",
              "Are you sure you want to logout?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Logout", onPress: () => logoutHandler() }
              ]
            );
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Logout</Text>
        </TouchableOpacity>
      </View>
    ),
    
    // Wellness group
    Yoga: YogaScreen,
    Diet: DietScreen,
    Appointments: AppointmentScreen,
    
    // Support group
    Chatbot: ChatbotScreen,
    Community: props => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18 }}>Pregnancy Community</Text>
        <Text style={{ marginTop: 10, color: '#666' }}>Connect with other expecting mothers</Text>
      </View>
    ),
    
    // Common screens that might be accessed from pregnancy flow
    ServiceDetails: ServiceDetailsScreen,
    MyBookings: MyBookingsScreen,
  };

  return (
    <PregnancyBottomTabNavigator 
      screens={pregnancyScreens}
      logoutHandler={logoutHandler}
    />
  );
};

const App = () => {
  const [userType, setUserType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [useEnhancedFeatures, setUseEnhancedFeatures] = useState(false);
  const navigationRef = useRef(null);

  // Function to check login status - can be called multiple times
  const checkLoginStatus = async () => {
    try {
      setIsLoading(true);
      console.log('Checking login status...');
      
      const storedIsLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const storedUserType = await AsyncStorage.getItem('userType');
      const storedEnhancedFeatures = await AsyncStorage.getItem('useEnhancedFeatures');
      
      console.log('Stored values - isLoggedIn:', storedIsLoggedIn, 'userType:', storedUserType);
      
      if (storedIsLoggedIn === 'true' && storedUserType) {
        setIsLoggedIn(true);
        setUserType(storedUserType);
        setUseEnhancedFeatures(storedEnhancedFeatures === 'true');
      } else {
        setIsLoggedIn(false);
        setUserType(null);
      }
    } catch (error) {
      console.error('Error checking login status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle login from LoginScreen
  const handleLogin = async (type, useEnhanced = false) => {
    await AsyncStorage.setItem('isLoggedIn', 'true');
    await AsyncStorage.setItem('userType', type);
    await AsyncStorage.setItem('useEnhancedFeatures', useEnhanced ? 'true' : 'false');
    await checkLoginStatus();
  };

  useEffect(() => {
    // Initialize services
    FallDetectionService.initialize();
    setupNotifications();
    
    // Check initial login status
    checkLoginStatus();
  }, []);

  const handlePersonaSelection = (type) => {
    setUserType(type);
  };

  const handleLogout = async () => {
    try {
      // Clear all data from AsyncStorage
      await AsyncStorage.clear();
      
      // Reset state to show login screen
      setUserType(null);
      setIsLoggedIn(false);
      
      console.log('Logged out successfully!');
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  // Handle navigation state change to detect when login completes
  const onStateChange = async () => {
    const currentRoute = navigationRef.current?.getCurrentRoute();
    console.log('Navigation state changed. Current route:', currentRoute?.name);
    
    // If we detect we've navigated to a main screen but our state doesn't reflect login,
    // recheck from AsyncStorage
    if (currentRoute?.name !== 'Login' && !isLoggedIn) {
      await checkLoginStatus();
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8F8' }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <ActivityIndicator size="large" color="#FF69B4" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <WalletProvider>
        <NavigationContainer
          ref={navigationRef}
          onStateChange={onStateChange}
        >
          {!isLoggedIn ? (
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
              <RootStack.Screen name="Login">
                {props => <LoginScreen {...props} onLogin={handleLogin} />}
              </RootStack.Screen>
            </RootStack.Navigator>
          ) : userType === 'alzheimers' ? (
            // Use the new Smart Navigation for Alzheimer's
            <AlzheimersSmartNavigator logoutHandler={handleLogout} />
          ) : (
            // Use the new Smart Navigation for Pregnancy
            <PregnancySmartNavigator logoutHandler={handleLogout} />
          )}
        </NavigationContainer>
      </WalletProvider>
    </SafeAreaProvider>
  );
};

export default App;