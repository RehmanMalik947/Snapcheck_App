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
import BackgroundTimer from 'react-native-background-timer';
import notifee, { AndroidImportance } from '@notifee/react-native';

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

  // LOGIC: System Information Sync (Independent of heartbeat)
  const performSystemSync = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;
      const parsedUser = JSON.parse(userStr);

      const deviceInfo = await getDeviceDataForConsole();

      // Update hardware states (Battery, WiFi etc)
      await apiService.syncDeviceData({
        userId: parsedUser.id,
        deviceModel: deviceInfo?.['Device Model'] || 'Device',
        uniqueId: deviceInfo?.['Unique ID (IMEI)'] || 'UniqueId',
        battery: deviceInfo?.['Battery'] || '0%',
        wifiStatus: deviceInfo?.['Wifi Status'] || 'OFF',
        locationStatus: deviceInfo?.['Location Tracker'] || 'OFF',
        deviceTimestamp: deviceInfo?.['Timestamp'] || new Date().toISOString(),
      });
      console.log('--- Hardware States Synced ---');
    } catch (e) {
      console.log('Sync Error:', e.message);
    }
  };

  useEffect(() => {
    const activateGuard = async () => {
      // 1. Channel Creation for Foreground Notification
      const channelId = await notifee.createChannel({
        id: 'guardian_active',
        name: 'Protection Monitor',
        importance: AndroidImportance.HIGH,
      });

      // 2. Start Service: This triggers the registerForegroundService in index.js
      await notifee.displayNotification({
        id: 'monitor_notification',
        title: 'SnapCheck: Active Monitoring',
        body: 'Child device activity is being synced...',
        android: {
          channelId,
          asForegroundService: true, // IMPORTANT FOR BACKGROUND
          ongoing: true,
          pressAction: { id: 'default' },
        },
      });
    };

    activateGuard();
    performSystemSync(); // Immediate initial sync

    // LOCK & SYSTEM CHECK INTERVAL (UI refresh logic only)
    const uiInterval = setInterval(async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const res = await apiService.getLatestDeviceInfo(user.id);
          if (res?.success) setIsLocked(!!res.data.isLocked);
        }
      } catch (e) {
        console.log('UI Polling Fail');
      }
    }, 5000);

    // Disable Back button on Android if locked
    const backAction = () => (isLocked ? true : false);
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => {
      clearInterval(uiInterval);
      backHandler.remove();
      // Notifee stop handle we do only on Logout
    };
  }, [isLocked]);

  const handleMonitorPress = async () => {
    setLoading(true);
    await performSystemSync();
    setLoading(false);
    Alert.alert('Status Sync', 'Device health data sent to parent dashboard.');
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Stop child monitoring and exit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          // Clear all background processes on logout
          BackgroundTimer.stopBackgroundTimer();
          await notifee.cancelAllNotifications();
          await AsyncStorage.clear();
          navigation.replace('Login');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <LockScreen visible={isLocked} />
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
          <View style={styles.headerRow}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.contentCard}>
        <View style={styles.buttonWrapper}>
          <PrimaryButton
            title={loading ? 'Syncing...' : "Monitor Child's Device"}
            onPress={handleMonitorPress}
          />
          <Text style={styles.guardianText}>
            PROTECTION ENGINE RUNNING IN BACKGROUND
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gradientEnd },
  header: { height: height * 0.25, width: '100%', paddingHorizontal: 20 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  logo: { width: 140, height: 40 },
  logoutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  logoutText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
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
  buttonWrapper: { width: '100%', alignItems: 'center' },
  guardianText: {
    marginTop: 15,
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
  },
});

export default HomeScreen;