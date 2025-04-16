// navigation/SmartBottomTabNavigator.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Screen groups for Alzheimer's persona
const screenGroups = {
  // Primary tabs - always visible
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

// Group tab navigator component - displays the screens within a group
const GroupTabNavigator = ({ groupName, screens, navigation }) => {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={() => {
        setModalVisible(false);
        navigation.navigate(item.name);
      }}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: item.color }]}>
        <Ionicons name={`${item.icon}-outline`} size={24} color="#FFF" />
      </View>
      <Text style={styles.menuItemText}>{item.title}</Text>
      <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
    </TouchableOpacity>
  );
  
  const headerTitle = 
    groupName === 'health' ? 'Health Hub' : 
    groupName === 'safety' ? 'Safety & Security' : 
    'More Features';
  
  return (
    <View style={styles.container}>
      {/* Group header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="settings-outline" size={24} color="#6A5ACD" />
        </TouchableOpacity>
      </View>
      
      {/* Featured screens in grid layout */}
      <View style={styles.featuredGrid}>
        {screens.map((screen, index) => (
          <TouchableOpacity
            key={screen.name}
            style={styles.gridItem}
            onPress={() => navigation.navigate(screen.name)}
          >
            <View style={[styles.gridIconContainer, { backgroundColor: screen.color }]}>
              <Ionicons name={`${screen.icon}-outline`} size={32} color="#FFF" />
            </View>
            <Text style={styles.gridItemText}>{screen.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* More button to show all available screens */}
      <TouchableOpacity
        style={styles.moreButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.moreButtonText}>View All Features</Text>
      </TouchableOpacity>
      
      {/* Modal menu with all available screens */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Features</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={[...screenGroups.health, ...screenGroups.safety, ...screenGroups.more]}
            renderItem={renderItem}
            keyExtractor={item => item.name}
            style={styles.menuList}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      </Modal>
    </View>
  );
};

// Create a smart bottom tab navigator that groups related screens
const SmartBottomTabNavigator = ({ screens, logoutHandler }) => {
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
  
  // Create stack navigators for groups
  const HealthGroupNavigator = ({ navigation }) => (
    <GroupTabNavigator 
      groupName="health" 
      screens={screenGroups.health}
      navigation={navigation}
    />
  );
  
  const SafetyGroupNavigator = ({ navigation }) => (
    <GroupTabNavigator 
      groupName="safety" 
      screens={screenGroups.safety}
      navigation={navigation}
    />
  );
  
  const MoreGroupNavigator = ({ navigation }) => (
    <GroupTabNavigator 
      groupName="more" 
      screens={screenGroups.more}
      navigation={navigation}
    />
  );
  
  // Create a stack navigator that includes all screens
  const MainStackNavigator = () => {
    // Combined screens from all groups
    const allScreens = [
      ...screenGroups.primary,
      ...screenGroups.health,
      ...screenGroups.safety,
      ...screenGroups.more
    ].filter(screen => screen.component);
    
    return (
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
        {allScreens.map(screen => (
          <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
            options={{ 
              title: screen.title || screen.name,
              headerShown: screen.name !== 'Home'
            }}
          />
        ))}
      </Stack.Navigator>
    );
  };
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          // Find the screen in one of our groups
          const screen = 
            screenGroups.primary.find(s => s.name === route.name) ||
            screenGroups.health.find(s => s.name === route.name) ||
            screenGroups.safety.find(s => s.name === route.name) ||
            screenGroups.more.find(s => s.name === route.name);
          
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
      {/* Main home screen */}
      <Tab.Screen 
        name="Home" 
        component={screens.Home}
      />
      
      {/* Health group tab */}
      <Tab.Screen 
        name="Health" 
        component={HealthGroupNavigator}
      />
      
      {/* Safety group tab */}
      <Tab.Screen 
        name="Safety" 
        component={SafetyGroupNavigator}
      />
      
      {/* More tab for additional features */}
      <Tab.Screen 
        name="More" 
        component={MoreGroupNavigator}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name={focused ? 'apps' : 'apps-outline'} 
              size={size} 
              color={color} 
            />
          )
        }}
      />
      
      {/* Profile tab */}
      <Tab.Screen 
        name="Profile" 
        component={screens.Profile}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 5,
  },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  gridIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  moreButton: {
    backgroundColor: '#6A5ACD',
    borderRadius: 8,
    padding: 15,
    margin: 20,
    alignItems: 'center',
  },
  moreButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});

export default SmartBottomTabNavigator;