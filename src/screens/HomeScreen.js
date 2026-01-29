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
  NativeModules, // Clean single import
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
import { getDeviceUsageStats } from '../services/UsageService';
import { AppState } from 'react-native';

const { width, height } = Dimensions.get('window');
const { UsageModule } = NativeModules; // Native module reference

const HomeScreen = ({ navigation }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  //Permission Check logic
  const checkAndRequestAllPermissions = async () => {
  try {
    if (UsageModule) {
      // --- PHASE 1: Usage Access Check ---
      const hasUsagePerm = await UsageModule.checkPermission();
      
      if (!hasUsagePerm) {
        Alert.alert(
          'Step 1: Usage Access',
          'Please enable "Usage Access" in settings!',
          [
            { 
              text: 'Open Settings', 
              onPress: () => UsageModule.openSettings() 
            }
          ],
          { cancelable: false }
        );
        return; // Pehli ijazat mang kar function rok den
      }

      // --- PHASE 2: Battery Optimization Check ---
      // Agar pehli mil gayi hai, toh ab doosri check karo
      const isBatteryUnrestricted = await UsageModule.isBatteryIgnored();
      
      if (!isBatteryUnrestricted) {
        Alert.alert(
          'Step 2: Battery Optimization',
          'Set battery usage to "Unrestricted" in settings!',
          [
            { 
              text: 'Configure Battery', 
              onPress: () => UsageModule.openBatterySettings() 
            }
          ],
          { cancelable: false }
        );
      }
    }
  } catch (err) {
    console.log("Permission Workflow Error:", err.message);
  }
};

  // --- LOGIC: Button Blocking (Hardware Interaction) ---
  useEffect(() => {
    const handleHardwareLock = async () => {
      if (UsageModule) {
        if (isLocked) {
          console.log('ACTIVATE: Native Button Blocking');
          await UsageModule.activateLock(); // Kiosk Mode / Pinning Start
        } else {
          console.log('DEACTIVATE: Buttons Restored');
          await UsageModule.deactivateLock(); // Kiosk Mode / Pinning Stop
        }
      }
    };
    handleHardwareLock();
  }, [isLocked]); // Yeh tab chalega jab Dashboard se Lock ka signal aayega

  const performUniversalSync = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      await apiService.post('/activity/heartbeat', { userId: user.id });

      const deviceInfo = await getDeviceDataForConsole();
      if (deviceInfo) {
        await apiService.syncDeviceData({
          userId: user.id, // Fixed: parsedUser was incorrect
          deviceModel: deviceInfo['Device Model'] || 'Device',
          uniqueId: deviceInfo['Unique ID (IMEI)'] || 'UniqueId',
          battery: deviceInfo['Battery'] || '0%',
          wifiStatus: deviceInfo['Wifi Status'] || 'OFF',
          locationStatus: deviceInfo['Location Tracker'] || 'OFF',
          deviceTimestamp: deviceInfo['Timestamp'] || new Date().toISOString(),
        });
      }

      const appsData = await getDeviceUsageStats();
      if (appsData && appsData.length > 0) {
        await apiService.post('/apps/sync', {
          userId: user.id,
          appsList: appsData,
        });
      }

      const lockRes = await apiService.getLatestDeviceInfo(user.id);
      if (lockRes?.success) setIsLocked(!!lockRes.data.isLocked);

      console.log('--- Snapshot Shipped OK ---');
    } catch (e) {
      console.log('Pulse Error:', e.message);
    }
  };

  useEffect(() => {
    const runProtection = async () => {
      const channelId = await notifee.createChannel({
        id: 'guard',
        name: 'Safe Guard',
      });
      await notifee.displayNotification({
        title: 'Protection Shield: ON',
        body: 'Activity and health stats are synced.',
        android: {
          channelId,
          asForegroundService: true,
          ongoing: true,
          pressAction: { id: 'default' },
        },
      });
      BackgroundTimer.runBackgroundTimer(performUniversalSync, 20000);
    };

    runProtection();
    performUniversalSync();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => isLocked,
    );

    return () => {
      BackgroundTimer.stopBackgroundTimer();
      backHandler.remove();
    };
  }, [isLocked]);

  useEffect(() => {
    // 1. App khulne par foran check karein
    checkAndRequestAllPermissions();

    // 2. Agar user settings se wapas SnapCheck par aaye (App becomes active), 
    // toh dubara check karein ke kya ijazat mil gayi?
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkAndRequestAllPermissions();
      }
    });

    return () => subscription.remove();
}, []);
  
  const handleMonitorPress = async () => {
    setLoading(true);
    await performUniversalSync();
    setLoading(false);
    Alert.alert('Live Status', 'Dashboard updated with latest snapshots.');
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
            <TouchableOpacity
              onPress={() => navigation.replace('Login')}
              style={styles.logoutBtn}
            >
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
            ACTIVE GUARD RUNNING IN BACKGROUND
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
  logoutText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 11 },
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
