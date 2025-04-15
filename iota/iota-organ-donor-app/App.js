import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

// Original Organ Donor Screens
import HomeScreen from './screens/HomeScreen';
import AddDonorScreen from './screens/AddDonorScreen';
import ViewRecordsScreen from './screens/ViewRecordsScreen';

// Medicine Authentication Screens
import MedicineHomeScreen from './screens/MedicineHomeScreen';
import RegisterMedicineScreen from './screens/RegisterMedicineScreen';
import VerifyMedicineScreen from './screens/VerifyMedicineScreen';
import MedicineListScreen from './screens/MedicineListScreen';

// Healthcare Records Screens
import HealthcareHomeScreen from './screens/HealthcareHomeScreen';
import HealthcareListScreen from './screens/HealthcareListScreen';
import AddHealthcareRecordScreen from './screens/AddHealthcareRecordScreen';
import ViewHealthcareRecordScreen from './screens/ViewHealthcareRecordScreen';

// Marketplace Screens
import MarketplaceScreen from './screens/MarketplaceScreen';
import ServiceDetailsScreen from './screens/ServiceDetailsScreen';
import BookingConfirmationScreen from './screens/BookingConfirmationScreen';
import MyBookingsScreen from './screens/MyBookingsScreen';
import RateServiceScreen from './screens/RateServiceScreen';
import MyServicesScreen from './screens/MyServicesScreen';
import AddServiceScreen from './screens/AddServiceScreen';

// Wallet Screen
import WalletScreen from './screens/WalletScreen';
import AddFundsScreen from './screens/AddFundsScreen';

// New Hospital and Emergency Screens
import HospitalHomeScreen from './screens/HospitalHomeScreen';
import HospitalListScreen from './screens/HospitalListScreen';
import HospitalDetailsScreen from './screens/HospitalDetailsScreen';
import RegisterHospitalScreen from './screens/RegisterHospitalScreen';
import AddAmbulanceScreen from './screens/AddAmbulanceScreen';
import EmergencyDetailsScreen from './screens/EmergencyDetailsScreen';
import UserLocationScreen from './screens/UserLocationScreen';

// Wallet context provider
import { WalletProvider } from './services/walletService';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function OrganDonorStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="OrganHome" 
        component={HomeScreen} 
        options={{ title: 'Organ Donor Registry' }} 
      />
      <Stack.Screen 
        name="AddDonor" 
        component={AddDonorScreen} 
        options={{ title: 'Add New Donor' }} 
      />
      <Stack.Screen 
        name="ViewRecords" 
        component={ViewRecordsScreen} 
        options={{ title: 'View Donor Records' }} 
      />
    </Stack.Navigator>
  );
}

function MedicineStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MedicineHome" 
        component={MedicineHomeScreen} 
        options={{ title: 'Medicine Authentication' }} 
      />
      <Stack.Screen 
        name="MedicineList" 
        component={MedicineListScreen} 
        options={{ title: 'Medicine Registry' }} 
      />
      <Stack.Screen 
        name="RegisterMedicine" 
        component={RegisterMedicineScreen} 
        options={{ title: 'Register New Medicine' }} 
      />
      <Stack.Screen 
        name="VerifyMedicine" 
        component={VerifyMedicineScreen} 
        options={{ title: 'Verify Medicine' }} 
      />
    </Stack.Navigator>
  );
}

function HealthcareStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HealthcareHome" 
        component={HealthcareHomeScreen} 
        options={{ title: 'Healthcare Records' }} 
      />
      <Stack.Screen 
        name="HealthcareList" 
        component={HealthcareListScreen} 
        options={{ title: 'Healthcare Records' }} 
      />
      <Stack.Screen 
        name="AddHealthcareRecord" 
        component={AddHealthcareRecordScreen} 
        options={{ title: 'Add Healthcare Record' }} 
      />
      <Stack.Screen 
        name="ViewHealthcareRecord" 
        component={ViewHealthcareRecordScreen} 
        options={{ title: 'Record Details' }} 
      />
    </Stack.Navigator>
  );
}

function MarketplaceStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Marketplace" 
        component={MarketplaceScreen} 
        options={{ title: 'Healthcare Marketplace' }} 
      />
      <Stack.Screen 
        name="ServiceDetails" 
        component={ServiceDetailsScreen} 
        options={{ title: 'Service Details' }} 
      />
      <Stack.Screen 
        name="BookingConfirmation" 
        component={BookingConfirmationScreen} 
        options={{ title: 'Booking Confirmed', headerShown: false }} 
      />
      <Stack.Screen 
        name="MyBookings" 
        component={MyBookingsScreen} 
        options={{ title: 'My Bookings' }} 
      />
      <Stack.Screen 
        name="RateService" 
        component={RateServiceScreen} 
        options={{ title: 'Rate Service' }} 
      />
      <Stack.Screen 
        name="MyServices" 
        component={MyServicesScreen} 
        options={{ title: 'My Services' }} 
      />
      <Stack.Screen 
        name="AddService" 
        component={AddServiceScreen} 
        options={({ route }) => ({ 
          title: route.params?.service ? 'Edit Service' : 'Add New Service'
        })} 
      />
    </Stack.Navigator>
  );
}

function WalletStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="WalletHome" 
        component={WalletScreen} 
        options={{ title: 'MEDAI Wallet' }} 
      />
      <Stack.Screen 
        name="AddFunds" 
        component={AddFundsScreen} 
        options={{ title: 'Add Funds' }}
      />
    </Stack.Navigator>
  );
}

// New Hospital and Emergency Stack
function HospitalStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HospitalHome" 
        component={HospitalHomeScreen} 
        options={{ title: 'Emergency Services' }} 
      />
      <Stack.Screen 
        name="HospitalList" 
        component={HospitalListScreen} 
        options={{ title: 'All Hospitals' }} 
      />
      <Stack.Screen 
        name="HospitalDetails" 
        component={HospitalDetailsScreen} 
        options={{ title: 'Hospital Details' }} 
      />
      <Stack.Screen 
        name="RegisterHospital" 
        component={RegisterHospitalScreen} 
        options={{ title: 'Register Hospital' }} 
      />
      <Stack.Screen 
        name="AddAmbulance" 
        component={AddAmbulanceScreen} 
        options={{ title: 'Add Ambulance' }} 
      />
      <Stack.Screen 
        name="EmergencyDetails" 
        component={EmergencyDetailsScreen} 
        options={{ title: 'Emergency Response', headerStyle: { backgroundColor: '#e74c3c' }, headerTintColor: '#fff' }} 
      />
      <Stack.Screen 
        name="UserLocation" 
        component={UserLocationScreen} 
        options={{ title: 'Safe Zone Settings' }} 
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <PaperProvider>
      <WalletProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;

                if (route.name === 'Organs') {
                  iconName = 'favorite';
                } else if (route.name === 'Medicines') {
                  iconName = 'medication';
                } else if (route.name === 'Healthcare') {
                  iconName = 'medical-services';
                } else if (route.name === 'Market') {
                  iconName = 'shopping-cart';
                } else if (route.name === 'Wallet') {
                  iconName = 'account-balance-wallet';
                } else if (route.name === 'Emergency') {
                  iconName = 'local-hospital';
                }

                return <MaterialIcons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: '#6200ee',
              tabBarInactiveTintColor: 'gray',
            })}
          >
            <Tab.Screen 
              name="Organs" 
              component={OrganDonorStack} 
              options={{ headerShown: false }}
            />
            <Tab.Screen 
              name="Medicines" 
              component={MedicineStack} 
              options={{ headerShown: false }}
            />
            <Tab.Screen 
              name="Healthcare" 
              component={HealthcareStack} 
              options={{ headerShown: false }}
            />
            <Tab.Screen 
              name="Market" 
              component={MarketplaceStack} 
              options={{ headerShown: false }}
            />
            <Tab.Screen 
              name="Emergency" 
              component={HospitalStack} 
              options={{ 
                headerShown: false,
                tabBarLabel: 'Emergency',
                tabBarIconStyle: { color: '#e74c3c' },
                tabBarActiveTintColor: '#e74c3c',
                tabBarBadge: '!',
                tabBarBadgeStyle: { backgroundColor: '#e74c3c' }
              }}
            />
            <Tab.Screen 
              name="Wallet" 
              component={WalletStack} 
              options={{ headerShown: false }}
            />
          </Tab.Navigator>
        </NavigationContainer>
      </WalletProvider>
    </PaperProvider>
  );
}