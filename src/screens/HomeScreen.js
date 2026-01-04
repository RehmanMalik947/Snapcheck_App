import React from 'react';
import { View, StyleSheet, Image, Dimensions, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '../constants/Colors';
import PrimaryButton from '../components/PrimaryButton';
import apiService from '../services/apiService';
import { getDeviceDataForConsole } from '../services/DeviceService';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  
  const handleMonitorPress = async () => {
    try {
      // 1. Storage se user data nikalna
      const userStr = await AsyncStorage.getItem('user');
      
      // FIX: JSON.parse sahi tarah use kiya
      if (!userStr) {
        Alert.alert('Error', 'Session expired. Please login again.');
        return;
      }
      const user = JSON.parse(userStr);

      console.log('Fetching Device Data...');

      // 2. Device se info collect karna
      const deviceInfo = await getDeviceDataForConsole();

      if (!deviceInfo) {
        Alert.alert('Error', 'Could not collect device information.');
        return;
      }

      // 3. Backend ko sync karna
      const result = await apiService.syncDeviceData({
        userId: user.id,
        deviceModel: deviceInfo['Device Model'],
        uniqueId: deviceInfo['Unique ID (IMEI)'],
        battery: deviceInfo['Battery'],
        wifiStatus: deviceInfo['Wifi Status'],
        locationStatus: deviceInfo['Location Tracker'],
        deviceTimestamp: deviceInfo['Timestamp'],
      });

      if (result.success) {
        // Console mein bhi dikhayein debug ke liye
        console.table(deviceInfo);

        Alert.alert(
          'Sync Successful',
          `Device: ${result.data.deviceModel}\nPlan: ${result.data.plan}\nRemaining: ${result.data.daysLeft}`,
        );
      } else {
        Alert.alert('Sync Failed', result.message || 'Database error');
      }
    } catch (error) {
      console.log('Sync Error:', error);
      Alert.alert('Error', 'Connection failed. Check if server is running.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent={true}
        backgroundColor="transparent"
      />
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.contentCard}>
        <View style={styles.buttonWrapper}>
          <PrimaryButton
            title="Monitor Child's Device"
            onPress={handleMonitorPress}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gradientEnd,
  },
  header: {
    height: height * 0.25,
    width: '100%',
    paddingHorizontal: 20,
  },
  logoContainer: {
    marginTop: 20,
  },
  logo: {
    width: 150,
    height: 40,
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#F8FAFF',
    marginTop: -40,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  buttonWrapper: {
    width: '100%',
  },
});
export default HomeScreen;