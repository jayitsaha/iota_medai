import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  StyleSheet,
  StatusBar,
  Alert,
  ScrollView,
  Modal,
  Image,
  Dimensions
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useTheme} from 'react-native-paper';

import AsyncStorage from '@react-native-async-storage/async-storage';

// Profile options with navigation routes
const PROFILES = {
  HOSPITAL: {
    displayName: 'Hospital Admin',
    icon: 'hospital-building',
    color: '#4A6FA5',
    route: 'HospitalLogin'
  },
  HEALTHCARE_PROVIDER: {
    displayName: 'Doctor',
    icon: 'doctor',
    color: '#2A9D8F',
    route: 'DoctorLogin'
  },
  PHARMACY: {
    displayName: 'Pharmacy',
    icon: 'pharmacy',
    color: '#E57373',
    route: 'PharmacyLogin'
  },
  PATIENT: {
    displayName: 'GUARDIAN',
    icon: 'account',
    color: '#64748B',
    route: 'SignInScreen'
  }
};

const SignInScreen = ({route, navigation}) => {
  const [data, setData] = React.useState({
    username: '',
    password: '',
    check_textInputChange: false,
    secureTextEntry: true,
    isValidPassword: true,
  });
  const {colors} = useTheme();
  const [checked, setChecked] = React.useState(true);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  const storeData = async (key, input) => {
    try {
      await AsyncStorage.setItem('@' + key, input);
    } catch (e) {
      console.log('error ', e);
    }
  };

  const getData = async () => {
    try {
      const username = await AsyncStorage.getItem('@username');
      const password = await AsyncStorage.getItem('@password');

      if (username !== null && password != null) {
        setChecked(true);

        setData({
          ...data,
          username: username,
          password: password,
          check_textInputChange: username.length > 0
        });
      }
    } catch (e) {
      console.log('error ', e);
    }
  };

  useEffect(() => {
    //Try to auto login
    getData();
  }, []);

  // Navigate to the dedicated login page for the selected profile
  const navigateToProfileLogin = (profile) => {
    setProfileModalVisible(false);
    navigation.navigate(profile.route);
  };

  //The checkbox mechanism
  const CheckBox = ({
    selected,
    onPress,
    style,
    textStyle,
    size = 30,
    color = '#211f30',
    text = '',
    ...props
  }) => (
    <TouchableOpacity
      style={[styles.checkBox, style]}
      onPress={() => setChecked(!checked)}>
      <Icon
        size={size}
        color={color}
        name={selected ? 'check-box' : 'check-box-outline-blank'}
      />

      <Text style={textStyle}> {text} </Text>
    </TouchableOpacity>
  );

  const textInputChange = val => {
    setData({
      ...data,
      username: val,
      check_textInputChange: val.length > 0,
    });
  };

  const handlePasswordChange = val => {
    if (val.trim().length >= 8) {
      setData({
        ...data,
        password: val,
        isValidPassword: true,
      });
    } else {
      setData({
        ...data,
        password: val,
        isValidPassword: false,
      });
    }
  };

  const updateSecureTextEntry = () => {
    setData({
      ...data,
      secureTextEntry: !data.secureTextEntry,
    });
  };

  const handleValidUser = val => {
    let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    if (reg.test(val) === true) {
      setData({
        ...data,
        isValidUser: true,
      });
    } else {
      setData({
        ...data,
        isValidUser: false,
      });
    }
  };

  const handleLogin = () => {
    // Original login logic
    if (data.username && data.password) {
      if (checked) {
        storeData('username', data.username);
        storeData('password', data.password);
      } else {
        storeData('username', '');
        storeData('password', '');
      }
      
      // Example profile-specific logic
      if(data.username == "jayit") {
        navigation.navigate('PoliceManDashboard', {
          username: 'username',
          jwt: 'token',
        });
      } else if(data.username == "ravi") {
        navigation.navigate('MainApp', {
          username: 'username',
          jwt: 'token',
        });
      } else if(data.username == "cleaner") {
        navigation.navigate('CleanerDashboard', {
          username: 'username',
          jwt: 'token',
        });
      } else if(data.username == "fireman") {
        navigation.navigate('FiremanDashboard', {
          username: 'username',
          jwt: 'token',
        });
      } else {
        Alert.alert('Invalid credentials', 'Please try again or select a profile type.');
      }
    } else {
      Alert.alert('Please enter both username and password to login');
    }
  };

  // Profile Switcher Modal
  const renderProfileModal = () => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={profileModalVisible}
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animatable.View 
            animation="fadeInUpBig"
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Profile Type</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Feather name="x" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.profileList}>
              {Object.values(PROFILES).map((profile, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.profileItem}
                  onPress={() => navigateToProfileLogin(profile)}
                >
                  <View style={[styles.profileIconContainer, { backgroundColor: profile.color + '20' }]}>
                    <MaterialCommunityIcons name={profile.icon} size={32} color={profile.color} />
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={styles.profileName}>{profile.displayName}</Text>
                    <Text style={styles.profileEmail}>Login as {profile.displayName}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setProfileModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#90A4AE" barStyle="light-content" hidden />
      <View style={styles.header}>
        <Image
          style={{
            width: 250,
            height: 250,
            resizeMode: 'contain',
            justifyContent: "center",
            alignSelf:"center",
          }}
          source={require("../assets/introduction_animation/app_logo.png")}
        />
      </View>

      <Animatable.View
        animation="fadeInUpBig"
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
          },
        ]}>

        <Text
          style={[
            styles.text_footer,
            {
              color: colors.text,
            },
          ]}>
          Username
        </Text>
        <View style={styles.action}>
          <FontAwesome name="user-o" color={colors.text} size={20} />
          <TextInput
            autoCompleteType="username"
            placeholder={'Your username'}
            value={data['username']}
            placeholderTextColor="#666666"
            style={[
              styles.textInput,
              {
                color: "black",
              },
            ]}
            autoCapitalize="none"
            onChangeText={val => textInputChange(val)}
          />
          {data.check_textInputChange ? (
            <Animatable.View animation="bounceIn">
              <Feather name="check-circle" color="green" size={20} />
            </Animatable.View>
          ) : null}
        </View>

        <Text
          style={[
            styles.text_footer,
            {
              color: colors.text,
              marginTop: 5,
            },
          ]}>
          Password
        </Text>
        <View style={styles.action}>
          <Feather name="lock" color={colors.text} size={20} />
          <TextInput
            autoCompleteType="password"
            placeholder="Your Password"
            value={data['password']}
            placeholderTextColor="#666666"
            secureTextEntry={data.secureTextEntry ? true : false}
            style={[
              styles.textInput,
              {
                color: "black",
              },
            ]}
            autoCapitalize="none"
            onChangeText={val => handlePasswordChange(val)}
          />
          <TouchableOpacity onPress={updateSecureTextEntry}>
            {data.secureTextEntry ? (
              <Feather name="eye-off" color="grey" size={20} />
            ) : (
              <Feather name="eye" color="grey" size={20} />
            )}
          </TouchableOpacity>
        </View>
        {data.isValidPassword ? null : (
          <Animatable.View animation="fadeInLeft" duration={500}>
            <Text style={styles.errorMsg}>
              Password must be 8 characters long.
            </Text>
          </Animatable.View>
        )}

        <TouchableOpacity>
          <Text style={{color: '#2F4858', marginTop: 15}}>
            Forgot password?
          </Text>
        </TouchableOpacity>

        <View style={{marginTop: 20}}>
          <CheckBox
            selected={checked}
            onPress={setChecked}
            text="Remember me"
          />
        </View>

        <View style={styles.button}>
          <TouchableOpacity
            style={[
              styles.signIn,
              {
                borderColor: '#90A4AE',
                borderWidth: 1,
                marginTop: 15,
                backgroundColor: '#90A4AE',
              },
            ]}
            onPress={handleLogin}>
            <View>
              <Text
                style={[
                  styles.textSign,
                  {
                    color: '#fff',
                  },
                ]}>
                Sign In
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setProfileModalVisible(true)}
            style={[
              styles.signIn,
              {
                borderColor: '#4A6FA5',
                backgroundColor: '#E3F2FD',
                borderWidth: 1,
                marginTop: 15,
              },
            ]}>
            <View style={styles.switchProfileButton}>
              <MaterialIcons name="switch-account" size={24} color="#4A6FA5" />
              <Text
                style={[
                  styles.textSign,
                  {
                    color: '#4A6FA5',
                    marginLeft: 10
                  },
                ]}>
                Switch Profile
              </Text>
            </View>
          </TouchableOpacity>

          {/* <TouchableOpacity
            onPress={() => navigation.navigate('HospitalLogin')}
            style={[
              styles.signIn,
              {
                borderColor: '#90A4AE',
                borderWidth: 1,
                marginTop: 15,
              },
            ]}>
            <Text
              style={[
                styles.textSign,
                {
                  color: '#90A4AE',
                },
              ]}>
              Sign in as Hospital Admin
            </Text>
          </TouchableOpacity> */}
        </View>
      </Animatable.View>

      {/* Profile Switcher Modal */}
      {renderProfileModal()}
    </View>
  );
};

export default SignInScreen;

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#90A4AE',
  },
  header: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 90
  },
  footer: {
    flex: 3,
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  text_header: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 30,
  },
  text_footer: {
    color: '#05375a',
    fontSize: 18,
  },
  action: {
    flexDirection: 'row',
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    paddingBottom: 5,
  },
  actionError: {
    flexDirection: 'row',
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FF0000',
    paddingBottom: 5,
  },
  textInput: {
    flex: 1,
    marginTop: Platform.OS === 'ios' ? 0 : -12,
    paddingLeft: 10,
    color: '#05375a',
  },
  errorMsg: {
    color: '#FF0000',
    fontSize: 14,
  },
  button: {
    alignItems: 'center',
    marginTop: 50,
  },
  signIn: {
    width: '100%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  textSign: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  checkBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#334155',
  },
  profileList: {
    marginBottom: 20,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  profileIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
  },
  closeButton: {
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    marginBottom: 30,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
});