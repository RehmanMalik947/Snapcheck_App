import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Text,
  Dimensions,
  StatusBar,
  Alert,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom Components & Services
import LockScreen from './LockScreen';
import { COLORS } from '../constants/Colors';
import PrimaryButton from '../components/PrimaryButton';
import apiService from '../services/apiService';
import { getDeviceDataForConsole } from '../services/DeviceService';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Backend se Lock Status check karne ka logic (Polling)
  const checkRemoteLock = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      const result = await apiService.getLatestDeviceInfo(user.id);

      if (result && result.success) {
        // Backend se agar 1 ya true aaye toh lock screen dikhao
        setIsLocked(!!result.data.isLocked);
      }
    } catch (error) {
      console.log('Lock Check Error:', error);
    }
  };

  useEffect(() => {
    // Har 5 seconds baad status check karein
    const interval = setInterval(checkRemoteLock, 5000);

    // Hardware Back Button ko block karna jab phone locked ho
    const backAction = () => {
      if (isLocked) return true; // Kuch na karo (block)
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => {
      clearInterval(interval);
      backHandler.remove();
    };
  }, [isLocked]);

  // 2. Device Data Sync karne ka logic
  const handleMonitorPress = async () => {
    try {
      setLoading(true);
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) {
        Alert.alert('Error', 'Session expired. Please login again.');
        return;
      }
      const user = JSON.parse(userStr);

      console.log('Fetching Device Data...');
      const deviceInfo = await getDeviceDataForConsole();

      if (!deviceInfo) {
        Alert.alert('Error', 'Could not collect device information.');
        setLoading(false);
        return;
      }

      const result = await apiService.syncDeviceData({
        userId: user.id,
        deviceModel: deviceInfo['Device Model'],
        uniqueId: deviceInfo['Unique ID (IMEI)'],
        battery: deviceInfo['Battery'],
        wifiStatus: deviceInfo['Wifi Status'],
        locationStatus: deviceInfo['Location Tracker'],
        deviceTimestamp: deviceInfo['Timestamp'],
      });

      setLoading(false);

      if (result.success) {
        Alert.alert(
          'Sync Successful',
          `Device: ${result.data.deviceModel}\nRemaining: ${result.data.daysLeft}`
        );
      } else {
        Alert.alert('Sync Failed', result.message || 'Database error');
      }
    } catch (error) {
      setLoading(false);
      console.log('Sync Error:', error);
      Alert.alert('Error', 'Connection failed. Check if server is running.');
    }
  };

  // 3. Logout Functionality
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from SnapCheck?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await AsyncStorage.clear(); // Clear all saved data
            navigation.replace('Login'); // Redirect to login and clear stack
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Overlay Lock Screen - Modal hamesha top par rahega */}
      <LockScreen visible={isLocked} />

      <StatusBar
        barStyle="light-content"
        translucent={true}
        backgroundColor="transparent"
      />

      {/* Header with Gradient */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            {/* Proper Logout Button */}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Main Content Area */}
      <View style={styles.contentCard}>
        <View style={styles.buttonWrapper}>
          <PrimaryButton
            title={loading ? "Syncing..." : "Monitor Child's Device"}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  logo: {
    width: 140,
    height: 40,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
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