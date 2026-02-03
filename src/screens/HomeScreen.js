import React, { useState, useEffect, useRef } from 'react'; // Added useRef
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
  NativeModules,
  AppState,
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

const { width, height } = Dimensions.get('window');
const { UsageModule } = NativeModules;

const HomeScreen = ({ navigation }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const monitoringRef = useRef(false);
  const isAlertVisible = useRef(false); // ✅ Prevents duplicate popups

  // HELPER: Format seconds to HH:MM:SS
  const formatTime = totalSeconds => {
    if (totalSeconds <= 0) return '00:00';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins < 10 ? '0' + mins : mins}:${
      secs < 10 ? '0' + secs : secs
    }`;
  };

  const checkAndRequestAllPermissions = async () => {
    // ✅ Exit if an alert is already shown to avoid "Alert Fatigue"
    if (isAlertVisible.current) return;

    try {
      if (UsageModule) {
        const hasUsagePerm = await UsageModule.checkPermission();
        if (!hasUsagePerm) {
          isAlertVisible.current = true;
          Alert.alert(
            'Activity Access',
            'Please enable "Usage Access" in settings to monitor screen time.',
            [
              {
                text: 'Open Settings',
                onPress: () => {
                  isAlertVisible.current = false;
                  UsageModule.openSettings();
                },
              },
              {
                text: 'Later',
                onPress: () => (isAlertVisible.current = false),
              },
            ],
            { cancelable: false },
          );
          return;
        }

        const isBatteryUnrestricted = await UsageModule.isBatteryIgnored();
        if (!isBatteryUnrestricted) {
          isAlertVisible.current = true;
          Alert.alert(
            'Battery Optimization',
            'Set battery usage to "Unrestricted" for continuous protection.',
            [
              {
                text: 'Configure Battery',
                onPress: () => {
                  isAlertVisible.current = false;
                  UsageModule.openBatterySettings();
                },
              },
              {
                text: 'Later',
                onPress: () => (isAlertVisible.current = false),
              },
            ],
            { cancelable: false },
          );
        }
      }
    } catch (err) {
      console.log('Permission Error:', err.message);
      isAlertVisible.current = false;
    }
  };

  const performUniversalSync = async () => {
    if (!monitoringRef.current) {
      console.log('Monitoring stopped, skipping sync.');
      return;
    }
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      await apiService.post('/activity/heartbeat', { userId: user.id });

      const deviceInfo = await getDeviceDataForConsole();
      if (deviceInfo) {
        await apiService.syncDeviceData({
          userId: user.id,
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
      if (lockRes?.success) {
        setIsLocked(!!lockRes.data.isLocked);
        if (lockRes.data.remainingSeconds !== undefined) {
          setRemainingSeconds(lockRes.data.remainingSeconds);
        }
      }

      console.log('--- Heartbeat Sync Success ---');
    } catch (e) {
      console.log('Pulse Error:', e.message);
    }
  };

  // Local 1-second countdown
  useEffect(() => {
    let interval;
    if (isMonitoring && remainingSeconds > 0 && !isLocked) {
      interval = setInterval(() => {
        setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isMonitoring, remainingSeconds, isLocked]);

  const startMonitoringEngine = async () => {
    const channelId = await notifee.createChannel({
      id: 'guard',
      name: 'Safe Guard',
    });
    await notifee.displayNotification({
      title: 'Monitoring Engaged',
      body: 'Child device activity is synced with parent dashboard.',
      android: {
        channelId,
        asForegroundService: true,
        ongoing: true,
        pressAction: { id: 'default' },
      },
    });
    monitoringRef.current = true;
    setIsMonitoring(true);

    performUniversalSync();
    BackgroundTimer.runBackgroundTimer(performUniversalSync, 15000);
    Alert.alert('Protection ON', 'The device monitoring has started.');
  };

  const stopMonitoringEngine = async () => {
    monitoringRef.current = false;
    setIsMonitoring(false);
    setRemainingSeconds(0);
    BackgroundTimer.stopBackgroundTimer();
    await notifee.cancelAllNotifications();
    Alert.alert('Protection OFF', 'Background monitoring is now paused.');
  };

  const handleToggleMonitoring = async () => {
    setLoading(true);
    if (isMonitoring) {
      await stopMonitoringEngine();
    } else {
      await startMonitoringEngine();
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleHardwareLock = async () => {
      if (UsageModule && typeof UsageModule.activateLock === 'function') {
        if (isLocked) await UsageModule.activateLock();
        else await UsageModule.deactivateLock();
      }
    };
    handleHardwareLock();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => isLocked,
    );

    const silentLockCheck = setInterval(async () => {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        const res = await apiService.getLatestDeviceInfo(user.id);
        if (res?.success) {
          setIsLocked(!!res.data.isLocked);
          if (res.data.remainingSeconds !== undefined)
            setRemainingSeconds(res.data.remainingSeconds);
        }
      }
    }, 10000);

    return () => {
      backHandler.remove();
      clearInterval(silentLockCheck);
    };
  }, [isLocked]);

  useEffect(() => {
    checkAndRequestAllPermissions();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') checkAndRequestAllPermissions();
    });
    return () => subscription.remove();
  }, []);

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

          {isMonitoring && remainingSeconds > 0 && (
            <View style={styles.timerWrapper}>
              <Text style={styles.timerLabel}>Time Remaining</Text>
              <Text style={styles.timerValue}>
                {formatTime(remainingSeconds)}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.contentCard}>
        <View style={styles.buttonWrapper}>
          <PrimaryButton
            title={
              loading
                ? 'Processing...'
                : isMonitoring
                ? 'Stop Monitoring'
                : "Monitor Child's Device"
            }
            onPress={handleToggleMonitoring}
          />
          <Text style={styles.guardianText}>
            {isMonitoring
              ? 'ENGINE IS RUNNING IN BACKGROUND'
              : 'SYSTEM IS IDLE (TAP TO START)'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.gradientEnd },

  // ✅ STYLES FIXED: Larger header to fit timer and logo properly
  header: { height: height * 0.29, width: '100%', paddingHorizontal: 20 },

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

  timerWrapper: { marginTop: 15, alignItems: 'center' },
  timerLabel: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerValue: {
    color: 'white',
    fontSize: 45,
    fontWeight: '900',
    marginTop: -5,
  },

  contentCard: {
    flex: 1,
    backgroundColor: '#F8FAFF',
    marginTop: -30, // Reduced overlap so timer is visible
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
