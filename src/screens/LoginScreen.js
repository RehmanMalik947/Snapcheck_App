import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert, // 1. Alert import kiya
  ActivityIndicator, // Loading spinner ke liye
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/Colors';
import PrimaryButton from '../components/PrimaryButton';
import apiService from '../services/apiService';

const LoginScreen = ({ navigation }) => {
  // 2. States define ki
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // 3. handleLogin function component ke andar laya
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await apiService.login({ email, password });
      setLoading(false);

      if (result.success) {
        navigation.replace('Home');
      } else {
        // Backend se aane wala error message
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    } catch (error) {
      // Is line ko add karein temporary check ke liye
      console.log('Detailed Error:', error.message);
      if (error.response) {
        console.log('Server Response:', error.response.data);
      }

      return {
        success: false,
        message:
          error.response?.data?.message || 'Login failed - Check Connectivity',
      };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Logo */}
      <View style={styles.header}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        <Text style={styles.title}>Get Started now</Text>
        <Text style={styles.subtitle}>
          Create an account or log in to explore our app
        </Text>

        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Loisbecket@gmail.com"
            placeholderTextColor={COLORS.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={[styles.input, { borderWidth: 0, flex: 1 }]}
              placeholder="*******"
              placeholderTextColor={COLORS.placeholder}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
            />
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
              <Text style={{ marginRight: 10, color: COLORS.placeholder }}>
                {isPasswordVisible ? '👁️' : '👁️'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Remember & Forgot Row */}
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
            />
            <Text style={styles.rememberText}>Remember me</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.forgotText}>Forgot Password ?</Text>
          </TouchableOpacity>
        </View>

        {/* 4. Button par handleLogin lagaya aur Loading check ki */}
        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.gradientStart}
            style={{ marginTop: 20 }}
          />
        ) : (
          <PrimaryButton title="Log In" onPress={handleLogin} />
        )}
      </View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  logo: {
    width: 200,
    height: 50,
  },
  card: {
    width: '90%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 25,
    paddingVertical: 40,
    // Shadow
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primaryText,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 15,
    color: COLORS.inputText,
    backgroundColor: COLORS.cardBackground,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 4,
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: COLORS.gradientStart,
  },
  rememberText: {
    fontSize: 13,
    color: '#1F2937',
  },
  forgotText: {
    fontSize: 13,
    color: COLORS.linkText,
    fontWeight: '600',
  },
});

export default LoginScreen;
