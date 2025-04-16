import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import 'react-native-gesture-handler';

// Import original app screens
import SignInScreen from './screens/SignInScreen';
import MainApp from './screens/MainApp';

// Import all the original screen components that are part of MainApp
// These imports aren't directly used here because they're used in MainApp.js,
// but listing them to make it clear we're preserving all these screens
import EmergencyReportScreen from './screens/EmergencyReportScreen';
import VoiceTextNoteScreen from './screens/VoiceTextNoteScreen';
import EmergencyStatusScreen from './screens/EmergencyStatusScreen';
import ConnectedPatientsScreen from './screens/ConnectedPatientsScreen';
import PatientDashboardScreen from './screens/PatientDashboardScreen';
import SafeZoneSettingsScreen from './screens/SafeZoneSettingsScreen';
import MedicationReminderScreen from './screens/MedicationReminderScreen';
import ProfileScreen from './screens/ProfileScreen';

// Import hospital screens
import HospitalLoginScreen from './screens/HospitalLoginScreen';
import HospitalRegisterScreen from './screens/HospitalRegisterScreen';
import HospitalDashboardScreen from './screens/HospitalDashboardScreen';
import OrganDonorRegistryScreen from './screens/OrganDonorRegistryScreen';
import AmbulanceManagementScreen from './screens/AmbulanceManagementScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="SignInScreen"
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Original Patient/Caregiver App Entry Points */}
        <Stack.Screen name="SignInScreen" component={SignInScreen} />
        <Stack.Screen name="MainApp" component={MainApp} />
        
        {/* Hospital Portal Screens */}
        <Stack.Screen name="HospitalLogin" component={HospitalLoginScreen} />
        <Stack.Screen name="HospitalRegister" component={HospitalRegisterScreen} />
        <Stack.Screen name="HospitalDashboard" component={HospitalDashboardScreen} />
        <Stack.Screen name="OrganDonorRegistry" component={OrganDonorRegistryScreen} />
        <Stack.Screen name="AmbulanceManagement" component={AmbulanceManagementScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});