import React, { useState, useEffect, useRef } from 'react';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundTimer from 'react-native-background-timer';
import notifee, { AndroidImportance } from '@notifee/react-native';
import {
  Bell,
  LayoutDashboard,
  FileText,
  Activity,
  User,
} from 'lucide-react-native';

// Services
import LockScreen from './LockScreen';
import { COLORS } from '../constants/Colors';
import apiService from '../services/apiService';
import { getDeviceDataForConsole } from '../services/DeviceService';
import { getDeviceUsageStats } from '../services/UsageService';

const { width, height } = Dimensions.get('window');
const { UsageModule } = NativeModules;

const HomeScreen = ({ navigation }) => {
  // --- Logic States ---
  const [isLocked, setIsLocked] = useState(false);
  const [dbData, setDbData] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [screenTimeToday, setScreenTimeToday] = useState('0h 0m');
  const [appsCount, setAppsCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [displayTime, setDisplayTime] = useState('');

  const monitoringRef = useRef(false);
  const isAlertVisible = useRef(false);

  // Add a new state variable for user profile
  const [userProfile, setUserProfile] = useState(null);

  // ✅ TIMER FORMATTER: Real-time UI logic
  const formatTimeText = totalSeconds => {
    if (totalSeconds <= 0) return '0 hours 0 mins';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    let timeStr = hrs > 0 ? `${hrs}h ` : '';
    timeStr += `${mins}m ${secs}s`; // Included seconds to show visual ticking
    return timeStr;
  };

  // --- LOGIC: MASTER AUTO-SYNC (Executed Background/Foreground every 15s) ---
  const performPulse = async () => {
    if (!monitoringRef.current) return;

    try {
      console.log('--- SYSTEM PULSE STARTING ---');
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      // Store user profile data
      const childId = user.id; // Check if your backend returned 'id' or 'childId'
      if (!childId) return;

      // 1. Activity Heartbeat (Updates totalUsageSeconds)
      await apiService.post('/activity/heartbeat', { userId: childId });

      // 2. Fetch Dashboard-Style Screen Summary
      const summaryRes = await apiService.getActivitySummary(childId);
      if (summaryRes.success) {
        setScreenTimeToday(summaryRes.screenTime);
      }

      // 3. Scan System State (Battery, Wi-Fi)
      const deviceInfo = await getDeviceDataForConsole();
      if (deviceInfo) {
        // ✅ KEY FIX: Map exactly to the migration columns
        await apiService.syncDeviceData({
          userId: childId,
          deviceModel: deviceInfo['Device Model'] || 'Device', // Use clean names
          uniqueId: deviceInfo['Unique ID (IMEI)'] || 'UniqueId',
          battery: deviceInfo['Battery'] || '0%',
          wifiStatus: deviceInfo['Wifi Status'] || 'OFF',
          locationStatus: deviceInfo['Location Tracker'] || 'OFF',
          deviceTimestamp: deviceInfo['Timestamp'] || new Date().toISOString(),
        });
      }

      // 4. Scan Top Apps Usage & Set App Count
      const appsData = await getDeviceUsageStats();
      if (appsData && appsData.length > 0) {
        setAppsCount(appsData.length);
        await apiService.post('/apps/sync', {
          userId: childId,
          appsList: appsData,
        });
      }

      // 5. MASTER SYNC: Retrieve Lock Status and Real Countdown value
      const res = await apiService.getLatestDeviceInfo(childId);
      if (res?.success) {
        const live = res.data;
        setDbData(live);
        setIsLocked(!!live.isLocked);
        // ✅ Update displayTime from API response
        if (live.displayTime) {
          setDisplayTime(live.displayTime);
        }

        // ✅ SYNC SECONDS: Jump to the server's time for accuracy
        if (live.remainingSeconds !== undefined) {
          const serverSeconds = parseInt(live.remainingSeconds);
          // Only jump if there is a big difference (e.g., > 5s) to keep it smooth
          if (Math.abs(remainingSeconds - serverSeconds) > 5) {
            setRemainingSeconds(serverSeconds);
          }
        }
      }
      console.log('--- ALL SYSTEMS SYNCED (Dashboard Matched) ---');
    } catch (e) {
      console.log('Master Engine Delay:', e.message);
    }
  };

  const activateBackgroundEngine = async () => {
    const channelId = await notifee.createChannel({
      id: 'monitor_guard',
      name: 'Safe guard',
      importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
      title: 'SnapCheck Protection ON',
      body: 'Continuous device protection is active.',
      android: { channelId, asForegroundService: true, ongoing: true },
    });

    monitoringRef.current = true;
    setIsMonitoring(true);
    performPulse();
    BackgroundTimer.runBackgroundTimer(performPulse, 15000);
  };

  // ✅ LOGIC: REAL-TIME TICKER (Local countdown between 15s server jumps)
  useEffect(() => {
    let ticker;
    if (isMonitoring && remainingSeconds > 0 && !isLocked) {
      ticker = setInterval(() => {
        setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000); // Update every second
    }
    return () => clearInterval(ticker); // Cleanup on unmount or dependency change
  }, [isMonitoring, remainingSeconds, isLocked]);

  useEffect(() => {
    // 🚀 INITIALIZATION: Triggers monitoring upon Login/Screen Mount
    activateBackgroundEngine();

    const backAction = () => (isLocked ? true : false);
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => {
      backHandler.remove();
      BackgroundTimer.stopBackgroundTimer();
    };
  }, []);

  // Control hardware blocking via Native Module
  useEffect(() => {
    if (UsageModule) {
      if (isLocked) UsageModule.activateLock();
      else UsageModule.deactivateLock();
    }
  }, [isLocked]);

  return (
    <SafeAreaView style={styles.container}>
      <LockScreen visible={isLocked} />
      <StatusBar barStyle="dark-content" />

      {/* --- DASHBOARD HEADER --- */}
      <View style={styles.headerBar}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logoTop}
          resizeMode="contain"
        />
        <TouchableOpacity style={{ position: 'relative' }}>
          <Bell color="#1e293b" size={26} />
          <View style={styles.alertDot} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageLabel}>Parental Control</Text>

        {/* --- DYNAMIC TIMER GRADIENT CARD --- */}
        <LinearGradient
          colors={['#5E4CFF', '#812BF7']}
          style={styles.topDashboardCard}
        >
          <View style={styles.flexRowBetween}>
            <View>
              <Text style={styles.tinyLabelWhite}>ACTIVE DEVICE</Text>
              <Text style={styles.boldModelText}>
                {dbData?.deviceModel || 'SnapCheck Monitoring'}
              </Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Online</Text>
            </View>
          </View>

          <View style={styles.timerCenterArea}>
            <View style={styles.circleAvatar}>
              <Image
                source={{
                  uri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aima',
                }}
                style={{ width: 55, height: 55, borderRadius: 27.5 }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.timeLabelRow}>
                <Text style={{ color: 'white', fontSize: 14 }}>🕒</Text>
                {/* DISPLAYING LOCAL SECOND-BY-SECOND TICKDOWN */}
                <Text style={styles.bigTimerTxt}>
                  {displayTime || formatTimeText(remainingSeconds)}
                </Text>
              </View>

              <View style={styles.barWrap}>
                {/* DYNAMIC FILL: Remaining Seconds vs Initial Allotted Minutes * 60 */}
                <View
                  style={[
                    styles.barCurrentFill,
                    {
                      width:
                        dbData?.timerLimit > 0
                          ? `${
                              (remainingSeconds / (dbData.timerLimit * 60)) *
                              100
                            }%`
                          : '100%',
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* --- DYNAMIC STATS GRID (Matched with Next.js Summary) --- */}
        <View style={styles.summaryGrid}>
          {/* Card 1: Live Daily usage summary */}
          <View style={[styles.infoBox, { backgroundColor: '#2175FF' }]}>
            <Text style={styles.boxTag}>Screen Time Today</Text>
            <Text style={styles.boxLargeVal}>{screenTimeToday}</Text>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>↓ LIVE</Text>
            </View>
          </View>

          {/* Card 2: List length from usage scan */}
          <View style={[styles.infoBox, { backgroundColor: '#9D32FF' }]}>
            <Text style={styles.boxTag}>Apps Opened Today</Text>
            <Text style={styles.boxLargeVal}>{appsCount}</Text>
            <View style={styles.tagPill}>
              <Text style={styles.tagText}>↑ ACTIVE</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.exitButton}
          onPress={async () => {
            BackgroundTimer.stopBackgroundTimer();
            await AsyncStorage.clear();
            navigation.replace('Login');
          }}
        >
          <Text style={styles.exitButtonText}>
            System Protection Engine • Deactivate and Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- FIGMA BOTTOM BAR MOCKUP --- */}
      <View style={styles.footerNav}>
        <NavElem icon={LayoutDashboard} label="Dashboard" active />
        <NavElem icon={FileText} label="Keylogger" />
        <NavElem icon={Activity} label="Activity" />
        <NavElem icon={User} label="Profile" />
      </View>
    </SafeAreaView>
  );
};

const NavElem = ({ icon: Icon, label, active }) => (
  <View style={{ alignItems: 'center' }}>
    <Icon color={active ? '#5D4BFF' : '#94A3B8'} size={24} />
    <Text
      style={{
        fontSize: 10,
        fontWeight: '900',
        color: active ? '#5D4BFF' : '#94A3B8',
        marginTop: 4,
      }}
    >
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingTop: 10,
    paddingBottom: 15,
    alignItems: 'center',
  },
  logoTop: { width: 120, height: 35 },
  alertDot: {
    width: 9,
    height: 9,
    backgroundColor: 'red',
    borderRadius: 4.5,
    position: 'absolute',
    right: 2,
    top: 0,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  pageLabel: {
    fontSize: 21,
    fontWeight: '900',
    color: '#BE1A5F',
    marginHorizontal: 25,
    marginBottom: 25,
  },
  topDashboardCard: {
    marginHorizontal: 5,
    borderRadius: 28,
    padding: 25,
    elevation: 15,
    shadowColor: '#5D4BFF',
    shadowOpacity: 0.3,
  },
  flexRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tinyLabelWhite: {
    color: 'white',
    opacity: 0.7,
    fontSize: 10,
    fontWeight: 'bold',
  },
  boldModelText: {
    color: 'white',
    fontSize: 19,
    fontWeight: 'bold',
    marginTop: 3,
  },
  activePill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  timerCenterArea: {
    flexDirection: 'row',
    marginTop: 28,
    gap: 15,
    alignItems: 'center',
  },
  circleAvatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  timeLabelRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  bigTimerTxt: { color: 'white', fontSize: 16, fontWeight: '900' },
  barWrap: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
  },
  barCurrentFill: { height: 7, backgroundColor: 'white', borderRadius: 15 },
  summaryGrid: {
    flexDirection: 'row',
    gap: 15,
    paddingHorizontal: 6,
    marginTop: 25,
  },
  infoBox: {
    flex: 1,
    height: 165,
    borderRadius: 28,
    padding: 20,
    justifyContent: 'space-between',
    elevation: 4,
  },
  boxTag: { color: 'white', fontSize: 11, fontWeight: 'bold', opacity: 0.9 },
  boxLargeVal: { color: 'white', fontSize: 24, fontWeight: '900' },
  tagPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  exitButton: { alignSelf: 'center', marginTop: 40 },
  exitButtonText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  footerNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingVertical: 14,
    justifyContent: 'space-around',
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
  },
});
export default HomeScreen;
