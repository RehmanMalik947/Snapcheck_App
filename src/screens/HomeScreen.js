import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, Image, Text, Dimensions, StatusBar, Alert,
  TouchableOpacity, BackHandler, NativeModules, AppState, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundTimer from 'react-native-background-timer';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Bell, LayoutDashboard, FileText, Activity, User } from 'lucide-react-native';

// Services
import LockScreen from './LockScreen';
import { COLORS } from '../constants/Colors';
import apiService from '../services/apiService';
import { getDeviceDataForConsole } from '../services/DeviceService';
import { getDeviceUsageStats } from '../services/UsageService';

const { width, height } = Dimensions.get('window');
const { UsageModule } = NativeModules;

const HomeScreen = ({ navigation }) => {
  // Logic States
  const [isLocked, setIsLocked] = useState(false);
  const [dbData, setDbData] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [screenTimeToday, setScreenTimeToday] = useState("0h 0m");
  const [appsCount, setAppsCount] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const monitoringRef = useRef(false);
  const isAlertVisible = useRef(false);

  // ✅ TIMER FORMATTER: Dynamic breakdown
  const formatTimeText = (totalSeconds) => {
    if (totalSeconds <= 0) return '0 hours 0 mins';
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    // Displays hours only if more than 0
    let timeStr = hrs > 0 ? `${hrs}h ` : "";
    timeStr += `${mins}m ${secs}s`; // Added seconds for visual feedback on Mobile
    return timeStr;
  };

  // --- LOGIC: MASTER AUTO-SYNC ---
  const performPulse = async () => {
    if (!monitoringRef.current) return;

    try {
      console.log('--- MASTER SYNC PULSE STARTING ---');
      const userStr = await AsyncStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);

      // 1. Send usage heartbeat (seconds calculator)
      await apiService.post('/activity/heartbeat', { userId: user.id });

      // 2. Fetch Screen time (Today's summary for Blue card)
      const summaryRes = await apiService.getActivitySummary(user.id);
      if (summaryRes.success) {
        setScreenTimeToday(summaryRes.screenTime);
      }

      // 3. System Hardware state (Battery, WiFi)
      const deviceInfo = await getDeviceDataForConsole();
      if (deviceInfo) {
        await apiService.syncDeviceData({
          userId: user.id,
          deviceModel: deviceInfo['Device Model'],
          uniqueId: deviceInfo['Unique ID (IMEI)'],
          battery: deviceInfo['Battery'],
          wifiStatus: deviceInfo['Wifi Status'],
          locationStatus: deviceInfo['Location Tracker'],
          deviceTimestamp: deviceInfo['Timestamp'],
        });
      }

      // 4. Scan Apps list for Purple card count
      const appsData = await getDeviceUsageStats();
      if (appsData && appsData.length > 0) {
        setAppsCount(appsData.length);
        await apiService.post('/apps/sync', { userId: user.id, appsList: appsData });
      }

      // 5. FETCH LOCK/TIMER STATUS (The Hardware Sync)
      const res = await apiService.getLatestDeviceInfo(user.id);
      if (res?.success) {
        const live = res.data;
        setDbData(live);
        setIsLocked(!!live.isLocked);

        // ✅ Syncing the Countdown: Override local seconds with server truth every 15s
        if (live.remainingSeconds !== undefined) {
          setRemainingSeconds(live.remainingSeconds);
        }
      }
    } catch (e) {
      console.log('Sync System Lag:', e.message);
    }
  };

  const activateBackgroundEngine = async () => {
    const channelId = await notifee.createChannel({ id: 'active_monitor', name: 'Safe guard' });
    await notifee.displayNotification({
      title: 'SnapCheck Protective Shield: Active',
      body: 'Usage and security states are being monitored.',
      android: { channelId, asForegroundService: true, ongoing: true },
    });

    monitoringRef.current = true;
    setIsMonitoring(true);
    performPulse(); // Initial Pulse
    BackgroundTimer.runBackgroundTimer(performPulse, 15000); // 15s master loop
  };

  // ✅ LOGIC: LOCAL UI TICKER (Counts down every 1 second)
  useEffect(() => {
    let ticker;
    if (isMonitoring && remainingSeconds > 0 && !isLocked) {
      ticker = setInterval(() => {
        setRemainingSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(ticker);
  }, [remainingSeconds, isMonitoring, isLocked]);

  useEffect(() => {
    activateBackgroundEngine();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => (isLocked ? true : false));

    return () => {
      backHandler.remove();
      BackgroundTimer.stopBackgroundTimer();
    };
  }, []);

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

      {/* --- HEADER --- */}
      <View style={styles.headerBar}>
        <Image source={require('../assets/logo.png')} style={styles.logoTop} resizeMode="contain" />
        <TouchableOpacity style={{ position: 'relative' }}>
          <Bell color="#1e293b" size={26} />
          <View style={styles.alertDot} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Text style={styles.pageLabel}>Parental Control</Text>

        {/* --- MAIN CARD: DYNAMIC LOCK COUNTDOWN --- */}
        <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.topDashboardCard}>
          <View style={styles.flexRowBetween}>
            <View>
              <Text style={styles.tinyLabelWhite}>ACTIVE DEVICE</Text>
              <Text style={styles.boldModelText}>{dbData?.deviceModel || dbData?.device_model || "Scanning Device..."}</Text>
            </View>
            <View style={styles.activePill}><Text style={styles.activePillText}>Online</Text></View>
          </View>

          <View style={styles.timerCenterArea}>
            <View style={styles.circleAvatar}>
              <Image source={{ uri: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aima' }} style={{ width: 55, height: 55, borderRadius: 27.5 }} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.timeLabelRow}>
                <Text style={{ color: 'white' }}>🕒</Text>
                {/* ✅ DISPLAYING THE LIVE SECOND-BY-SECOND TIMER */}
                <Text style={styles.bigTimerTxt}>{formatTimeText(remainingSeconds)} left</Text>
              </View>

              <View style={styles.barWrap}>
                {/* ✅ DYNAMIC PROGRESS BAR: Visual Fill Ratio */}
                <View style={[styles.barCurrentFill, {
                  width: (dbData?.timerLimit > 0 && remainingSeconds > 0)
                    ? `${(remainingSeconds / (dbData.timerLimit * 60)) * 100}%`
                    : '0%'
                }]} />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* --- DYNAMIC GRID --- */}
        <View style={styles.summaryGrid}>
          {/* Box 1: Calculated Screen Usage (Matches Website) */}
          <View style={[styles.infoBox, { backgroundColor: '#3B82F6' }]}>
            <Text style={styles.boxTag}>Screen Time Today</Text>
            <Text style={styles.boxLargeVal}>{screenTimeToday}</Text>
            <View style={styles.tagPill}><Text style={styles.tagText}>↓ LIVE</Text></View>
          </View>

          {/* Box 2: Total unique apps scanned */}
          <View style={[styles.infoBox, { backgroundColor: '#9333EA' }]}>
            <Text style={styles.boxTag}>Apps Opened Today</Text>
            <Text style={styles.boxLargeVal}>{appsCount || "0"}</Text>
            <View style={styles.tagPill}><Text style={styles.tagText}>↑ SYNC</Text></View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.exitRow}
          onPress={async () => {
            BackgroundTimer.stopBackgroundTimer();
            await AsyncStorage.clear();
            navigation.replace('Login');
          }}
        >
          <Text style={styles.exitText}>Secure Monitor Active • Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* --- TAB BAR MOCK --- */}
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
    <Icon color={active ? '#4F46E5' : '#94A3B8'} size={24} />
    <Text style={{ fontSize: 10, fontWeight: '900', color: active ? '#4F46E5' : '#94A3B8', marginTop: 5 }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 25, alignItems: 'center' },
  logoTop: { width: 120, height: 35 },
  alertDot: { width: 10, height: 10, backgroundColor: 'red', borderRadius: 5, position: 'absolute', right: 2, top: 0, borderWidth: 1.5, borderColor: 'white' },
  pageLabel: { fontSize: 20, fontWeight: '900', color: '#BE185D', marginHorizontal: 25, marginBottom: 20 },
  topDashboardCard: { marginHorizontal: 20, borderRadius: 28, padding: 25, elevation: 12 },
  flexRowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  tinyLabelWhite: { color: 'white', opacity: 0.7, fontSize: 10, fontWeight: 'bold' },
  boldModelText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  activePill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  activePillText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  timerCenterArea: { flexDirection: 'row', marginTop: 25, gap: 15, alignItems: 'center' },
  circleAvatar: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: 'white' },
  timeLabelRow: { flexDirection: 'row', gap: 5, alignItems: 'center', marginBottom: 10 },
  bigTimerTxt: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  barWrap: { height: 7, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
  barCurrentFill: { height: 7, backgroundColor: 'white', borderRadius: 10 },
  summaryGrid: { flexDirection: 'row', gap: 15, paddingHorizontal: 20, marginTop: 25 },
  infoBox: { flex: 1, height: 170, borderRadius: 25, padding: 18, justifyContent: 'space-between', elevation: 5 },
  boxTag: { color: 'white', fontSize: 11, fontWeight: 'bold', opacity: 0.9 },
  boxLargeVal: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  tagPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { color: 'white', fontSize: 9, fontWeight: '900' },
  exitRow: { alignSelf: 'center', marginTop: 35 },
  exitText: { color: '#94a3b8', fontSize: 10, fontWeight: '900', textDecorationLine: 'underline' },
  footerNav: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 14, justifyContent: 'space-around', position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'white' }
});

export default HomeScreen;