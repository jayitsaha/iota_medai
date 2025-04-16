import React, {useState, useEffect} from 'react';
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
  Image,
  SafeAreaView
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useTheme} from 'react-native-paper';

import AsyncStorage from '@react-native-async-storage/async-storage';

const PharmacyLoginScreen = ({navigation}) => {
  const [data, setData] = React.useState({
    username: 'pharmacy@guardian.com',
    password: 'pharmacy123',
    check_textInputChange: true,
    secureTextEntry: true,
    isValidPassword: true,
  });
  const {colors} = useTheme();
  const [checked, setChecked] = React.useState(true);
  const [loading, setLoading] = useState(false);

  const storeData = async (key, input) => {
    try {
      await AsyncStorage.setItem('@' + key, input);
    } catch (e) {
      console.log('error ', e);
    }
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

  const handleLogin = async () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(async () => {
      try {
        // For demo, we'll just check if credentials match the hardcoded values
        if (data.username === 'pharmacy@guardian.com' && data.password === 'pharmacy123') {
          // Save credentials if remember me is checked
          if (checked) {
            await storeData('username', data.username);
            await storeData('password', data.password);
          } else {
            await storeData('username', '');
            await storeData('password', '');
          }
          
          // Store user type and other data
          await AsyncStorage.setItem('authToken', 'guardian-auth-token-' + Date.now());
          await AsyncStorage.setItem('userType', 'pharmacy');
          await AsyncStorage.setItem('pharmacyData', JSON.stringify({
            id: 'pharm-789012',
            name: 'MedPlus Pharmacy',
            location: 'Koramangala, Bangalore'
          }));
          
          setLoading(false);
          
          // Navigate to pharmacy dashboard
          navigation.navigate('PharmacyDashboardScreen');
        } else {
          setLoading(false);
          Alert.alert('Invalid Credentials', 'The username or password is incorrect');
        }
      } catch (error) {
        setLoading(false);
        console.error('Login error:', error);
        Alert.alert('Login Failed', 'An error occurred during login. Please try again.');
      }
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#E57373" barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Image
            style={styles.logo}
            source={require("../assets/introduction_animation/app_logo.png")}
          />
          <Text style={styles.headerTitle}>Pharmacy Login</Text>
        </View>
      </View>

      <Animatable.View
        animation="fadeInUpBig"
        style={styles.footer}>

        <Text style={styles.welcomeText}>
          Welcome to Pharmacy Portal
        </Text>
        <Text style={styles.instructionText}>
          Access medicine verification and registration
        </Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.text_footer}>
            Email
          </Text>
          <View style={styles.action}>
            <FontAwesome name="user-o" color="#05375a" size={20} />
            <TextInput
              placeholder="Your Email"
              value={data.username}
              placeholderTextColor="#666666"
              style={styles.textInput}
              autoCapitalize="none"
              onChangeText={val => textInputChange(val)}
            />
            {data.check_textInputChange ? (
              <Animatable.View animation="bounceIn">
                <Feather name="check-circle" color="green" size={20} />
              </Animatable.View>
            ) : null}
          </View>

          <Text style={[styles.text_footer, {marginTop: 20}]}>
            Password
          </Text>
          <View style={styles.action}>
            <Feather name="lock" color="#05375a" size={20} />
            <TextInput
              placeholder="Your Password"
              value={data.password}
              placeholderTextColor="#666666"
              secureTextEntry={data.secureTextEntry ? true : false}
              style={styles.textInput}
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

          <View style={styles.forgotPassword}>
            <TouchableOpacity>
              <Text style={styles.forgotPasswordText}>
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rememberMe}>
            <CheckBox
              selected={checked}
              onPress={setChecked}
              text="Remember me"
            />
          </View>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              {loading ? (
                <Animatable.View animation="rotate" iterationCount="infinite" duration={1000} style={{marginRight: 10}}>
                  <Feather name="loader" size={20} color="#FFFFFF" />
                </Animatable.View>
              ) : (
                <MaterialCommunityIcons name="pharmacy" size={20} color="#FFFFFF" style={{marginRight: 10}} />
              )}
              <Text style={styles.loginButtonText}>
                {loading ? 'Signing In...' : 'Sign In'}
              </Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.switchProfileContainer}>
            <TouchableOpacity
              onPress={() => navigation.navigate('SignIn')}
              style={styles.switchProfileButton}
            >
              <MaterialIcons name="switch-account" size={20} color="#E57373" style={{marginRight: 10}} />
              <Text style={styles.switchProfileText}>
                Switch Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animatable.View>
    </SafeAreaView>
  );
};

export default PharmacyLoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E57373',
  },
  header: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
  },
  footer: {
    flex: 3,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingVertical: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 30,
  },
  formContainer: {
    paddingHorizontal: 30,
  },
  text_footer: {
    color: '#05375a',
    fontSize: 16,
    fontWeight: '500',
  },
  action: {
    flexDirection: 'row',
    marginTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 5,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    marginLeft: 10,
    color: '#05375a',
    fontSize: 16,
    paddingVertical: 8,
  },
  errorMsg: {
    color: '#FF0000',
    fontSize: 14,
    marginTop: 5,
  },
  forgotPassword: {
    marginTop: 15,
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: '#E57373',
    fontSize: 14,
  },
  rememberMe: {
    marginTop: 20,
  },
  checkBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButton: {
    marginTop: 35,
    height: 50,
    backgroundColor: '#E57373',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E57373',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchProfileContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  switchProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchProfileText: {
    color: '#E57373',
    fontSize: 16,
    fontWeight: '500',
  },
});