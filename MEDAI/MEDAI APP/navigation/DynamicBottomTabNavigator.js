// navigation/DynamicBottomTabNavigator.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';

// Placeholder components that don't attempt to update state during render
const BackTabPlaceholder = () => {
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderText}>Back to Main Menu</Text>
    </View>
  );
};

const GroupTabPlaceholder = () => {
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderText}>Loading Group...</Text>
    </View>
  );
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Screen groups for Alzheimer's persona
const screenGroups = {
  // Primary tabs - always visible in main view
  primary: [
    {
      name: 'Home',
      component: null, // Will be passed from parent
      icon: 'home',
      color: '#6A5ACD'
    },
    {
      name: 'Health',
      component: null,
      icon: 'medkit',
      color: '#2DCE89',
      group: 'health'
    },
    {
      name: 'Safety',
      component: null,
      icon: 'shield-checkmark',
      color: '#11CDEF',
      group: 'safety'
    },
    {
      name: 'More',
      component: null,
      icon: 'apps',
      color: '#FB6340',
      group: 'more'
    },
    {
      name: 'Profile',
      component: null,
      icon: 'person',
      color: '#6A5ACD'
    }
  ],
  
  // Secondary screens - accessible via group tabs
  health: [
    {
      name: 'Medication',
      title: 'My Medications',
      icon: 'medical',
      color: '#5E72E4',
      component: null
    },
    {
      name: 'HealthRecords',
      title: 'Health Records',
      icon: 'document-text',
      color: '#2DCE89',
      component: null
    },
    {
      name: 'MedicineAuth',
      title: 'Medicine Verification',
      icon: 'shield-checkmark',
      color: '#FB6340',
      component: null
    }
  ],
  
  safety: [
    {
      name: 'SafeZone',
      title: 'Safe Zone',
      icon: 'locate',
      color: '#11CDEF',
      component: null
    },
    {
      name: 'Contacts',
      title: 'Emergency Contacts',
      icon: 'call',
      color: '#FB6340', 
      component: null
    },
    {
      name: 'FallDetection',
      title: 'Fall Detection',
      icon: 'fitness',
      color: '#5E72E4',
      component: null
    }
  ],
  
  more: [
    {
      name: 'Marketplace',
      title: 'Healthcare Marketplace',
      icon: 'cart',
      color: '#6A5ACD',
      component: null
    },
    {
      name: 'Wallet',
      title: 'My Wallet',
      icon: 'wallet',
      color: '#2DCE89',
      component: null
    },
    {
      name: 'OrganDonation',
      title: 'Organ Donation',
      icon: 'heart',
      color: '#FB6340',
      component: null
    },
    {
      name: 'Journal',
      title: 'Memory Journal',
      icon: 'book',
      color: '#11CDEF',
      component: null
    }
  ]
};

// Back button component for the header
const BackButton = ({ onPress }) => (
  <TouchableOpacity 
    style={{ marginLeft: 15 }}
    onPress={onPress}
  >
    <Ionicons name="arrow-back" size={24} color="white" />
  </TouchableOpacity>
);

// Wrapper component to add back button functionality to group screens
const GroupScreenWrapper = ({ component: ScreenComponent, title, backToMain }) => {
  const navigation = useNavigation();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#6A5ACD' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => <BackButton onPress={backToMain} />,
      }}
    >
      <Stack.Screen 
        name={title}
        options={{ title }}
      >
        {props => <ScreenComponent {...props} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// Main dynamic tab navigator component
const DynamicBottomTabNavigator = ({ screens, logoutHandler }) => {
  const [currentView, setCurrentView] = useState('main');
  const [currentGroup, setCurrentGroup] = useState(null);
  const [tabHistory, setTabHistory] = useState(['main']);
  const navigation = useNavigation();

  // Assign components to screen groups
  Object.keys(screens).forEach(screenName => {
    // Assign to primary screens
    const primaryScreen = screenGroups.primary.find(s => s.name === screenName);
    if (primaryScreen) {
      primaryScreen.component = screens[screenName];
    }
    
    // Assign to health group
    const healthScreen = screenGroups.health.find(s => s.name === screenName);
    if (healthScreen) {
      healthScreen.component = screens[screenName];
    }
    
    // Assign to safety group
    const safetyScreen = screenGroups.safety.find(s => s.name === screenName);
    if (safetyScreen) {
      safetyScreen.component = screens[screenName];
    }
    
    // Assign to more group
    const moreScreen = screenGroups.more.find(s => s.name === screenName);
    if (moreScreen) {
      moreScreen.component = screens[screenName];
    }
  });

  // Handle navigation to a group
  const navigateToGroup = (groupName) => {
    setCurrentGroup(groupName);
    setCurrentView(groupName);
    setTabHistory([...tabHistory, groupName]);
    
    // Reset the stack navigation to prevent weird back button behavior
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );
  };

  // Handle back navigation
  const navigateBack = () => {
    // Remove current view from history
    const newHistory = [...tabHistory];
    newHistory.pop();
    
    // Get previous view
    const previousView = newHistory[newHistory.length - 1];
    
    setCurrentView(previousView);
    setTabHistory(newHistory);
    
    // If we're going back to main, clear the current group
    if (previousView === 'main') {
      setCurrentGroup(null);
    }
  };

  // Group header component with title and back button
  const GroupHeader = ({ title }) => {
    return (
      <View style={styles.groupHeader}>
        <TouchableOpacity onPress={navigateBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#6A5ACD" />
          <Text style={styles.backText}>Main Menu</Text>
        </TouchableOpacity>
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
    );
  };

  // Create a stack navigator for each tab to handle nested navigation
  const createTabStack = (screen) => {
    return () => (
      <Stack.Navigator
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
          ),
        }}
      >
        <Stack.Screen
          name={screen.name}
          component={screen.component}
          options={{ 
            title: screen.title || screen.name,
            headerShown: screen.name !== 'Home'
          }}
        />
        
        {/* Common screens that should be accessible from any stack */}
        <Stack.Screen 
          name="ServiceDetails" 
          component={screens.ServiceDetails || (() => <View><Text>Service Details</Text></View>)} 
          options={{ title: 'Service Details' }} 
        />
        <Stack.Screen 
          name="MyBookings" 
          component={screens.MyBookings || (() => <View><Text>My Bookings</Text></View>)} 
          options={{ title: 'My Bookings' }} 
        />
      </Stack.Navigator>
    );
  };

  // Special handler for group tabs
  const handleGroupTab = (screen) => {
    // If the tab has a group, navigate to that group
    if (screen.group) {
      return () => (
        <View style={styles.groupContainer}>
          <GroupHeader title={getGroupTitle(screen.group)} />
          <View style={styles.groupContent}>
            <Text style={styles.groupDescription}>
              Select one of the {screen.group} options below
            </Text>
          </View>
        </View>
      );
    }
    
    // Otherwise, return the normal stack
    return createTabStack(screen);
  };

  // Get the title for a group
  const getGroupTitle = (groupName) => {
    switch(groupName) {
      case 'health':
        return 'Health Hub';
      case 'safety':
        return 'Safety & Security';
      case 'more':
        return 'More Features';
      default:
        return groupName.charAt(0).toUpperCase() + groupName.slice(1);
    }
  };

  // Render different tab navigators based on current view
  const renderTabs = () => {
    // Determine which tabs to show based on current view
    let tabsToShow = [];
    
    if (currentView === 'main') {
      // In main view, show primary tabs
      tabsToShow = screenGroups.primary;
    } else {
      // In group view, show the tabs for the current group
      tabsToShow = screenGroups[currentView];
      
      // Add a "Back to Main" tab
      tabsToShow = [
        {
          name: 'BackToMain',
          title: 'Back',
          icon: 'arrow-back',
          color: '#6A5ACD',
          component: () => <View />
        },
        ...tabsToShow
      ];
    }

    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            // Find the screen definition
            const screen = tabsToShow.find(s => s.name === route.name);
            if (!screen) return null;
            
            const iconName = focused ? screen.icon : `${screen.icon}-outline`;
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#6A5ACD',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            elevation: 0,
            borderTopWidth: 1,
            borderTopColor: '#F0F0F0',
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          headerShown: false
        })}
      >
        {tabsToShow.map(screen => (
          <Tab.Screen
            key={screen.name}
            name={screen.name}
            component={
              screen.name === 'BackToMain' 
                ? () => <BackTabPlaceholder />
                : screen.group 
                  ? () => <GroupTabPlaceholder />
                  : createTabStack(screen)
            }
            listeners={{
              tabPress: e => {
                // If this is a group tab in main view, prevent default navigation
                if (currentView === 'main' && screen.group) {
                  e.preventDefault();
                  navigateToGroup(screen.group);
                }
                // If this is the back button, prevent default navigation
                if (screen.name === 'BackToMain') {
                  e.preventDefault();
                  navigateBack();
                }
              }
            }}
            options={{
              title: screen.name === 'BackToMain' ? 'Back' : screen.title || screen.name
            }}
          />
        ))}
      </Tab.Navigator>
    );
  };

  return renderTabs();
};

const styles = StyleSheet.create({
  groupContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 5,
    fontSize: 16,
    color: '#6A5ACD',
    fontWeight: '500',
  },
  groupTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginRight: 40, // To offset the back button and center the title
  },
  groupContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  groupDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  placeholderText: {
    fontSize: 16,
    color: '#888',
  },
});

export default DynamicBottomTabNavigator;