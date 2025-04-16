// navigation/PregnancyBottomTabNavigator.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Placeholder screens for tab content
const BackButtonScreen = () => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>Returning to main menu...</Text>
  </View>
);

const GroupScreen = () => (
  <View style={styles.placeholderContainer}>
    <Text style={styles.placeholderText}>Loading group options...</Text>
  </View>
);

// Screen groups for Pregnancy persona
const screenGroups = {
  // Primary tabs - always visible in main view
  primary: [
    {
      name: 'Home',
      component: null, // Will be passed from parent
      icon: 'home',
      color: '#FF69B4'
    },
    {
      name: 'Wellness',
      component: null,
      icon: 'fitness',
      color: '#FF8FD0',
      group: 'wellness'
    },
    {
      name: 'Support',
      component: null,
      icon: 'people',
      color: '#FFA6DB',
      group: 'support'
    },
    {
      name: 'Profile',
      component: null,
      icon: 'person',
      color: '#FF69B4'
    }
  ],
  
  // Wellness screens - shown when Wellness is selected
  wellness: [
    {
      name: 'Yoga',
      title: 'Prenatal Yoga',
      icon: 'fitness',
      color: '#FF8FD0',
      component: null
    },
    {
      name: 'Diet',
      title: 'Diet & Nutrition',
      icon: 'nutrition',
      color: '#FFA6DB',
      component: null
    },
    {
      name: 'Appointments',
      title: 'Appointment Scheduler',
      icon: 'calendar',
      color: '#FF69B4',
      component: null
    }
  ],
  
  // Support screens - shown when Support is selected
  support: [
    {
      name: 'Chatbot',
      title: 'Pregnancy Assistant',
      icon: 'chatbubbles',
      color: '#FFA6DB',
      component: null
    },
    {
      name: 'Community',
      title: 'Pregnancy Community',
      icon: 'people',
      color: '#FF69B4',
      component: null
    }
  ]
};

// Main dynamic tab navigator component for pregnancy
const PregnancyBottomTabNavigator = ({ screens, logoutHandler }) => {
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
    
    // Assign to wellness group
    const wellnessScreen = screenGroups.wellness.find(s => s.name === screenName);
    if (wellnessScreen) {
      wellnessScreen.component = screens[screenName];
    }
    
    // Assign to support group
    const supportScreen = screenGroups.support.find(s => s.name === screenName);
    if (supportScreen) {
      supportScreen.component = screens[screenName];
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

  // Create stack navigator for each screen
  const createScreenStack = (screen) => {
    return () => (
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#FF69B4' },
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
      </Stack.Navigator>
    );
  };

  // Get the title for a group
  const getGroupTitle = (groupName) => {
    switch(groupName) {
      case 'wellness':
        return 'Wellness & Health';
      case 'support':
        return 'Support & Community';
      default:
        return groupName.charAt(0).toUpperCase() + groupName.slice(1);
    }
  };

  // Render the appropriate tab navigator based on current view
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
          color: '#FF69B4',
          component: BackButtonScreen
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
          tabBarActiveTintColor: '#FF69B4',
          tabBarInactiveTintColor: 'gray',
          tabBarStyle: {
            elevation: 0,
            borderTopWidth: 1,
            borderTopColor: '#FFE0EB',
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
                ? BackButtonScreen
                : screen.group 
                  ? GroupScreen
                  : createScreenStack(screen)
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

// Styles for the navigator
const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F8',
  },
  placeholderText: {
    fontSize: 16,
    color: '#FF69B4',
    fontWeight: '500',
    textAlign: 'center',
    padding: 20
  },
  groupContainer: {
    flex: 1,
    backgroundColor: '#FFF5F8',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 5,
    fontSize: 16,
    color: '#FF69B4',
    fontWeight: '500',
  },
  groupTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginRight: 40,
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
  }
});

export default PregnancyBottomTabNavigator;