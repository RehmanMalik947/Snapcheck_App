// index.js
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';
import BackgroundTimer from 'react-native-background-timer';
import apiService from './src/services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ REAL-TIME BACKGROUND MONITORING ENGINE
notifee.registerForegroundService((notification) => {
    return new Promise(async (resolve) => {
        // Start ticking natively using BackgroundTimer
        // This will keep ticking even when app is minimized or phone is locked
        BackgroundTimer.runBackgroundTimer(async () => {
            try {
                const userStr = await AsyncStorage.getItem('user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    // Hit the Activity heartbeat endpoint
                    const response = await apiService.post("/activity/heartbeat", { userId: user.id });
                    
                    if (response?.data?.success) {
                      console.log("Activity Monitor: Heartbeat Ticked (Active)");
                    }
                }
            } catch (err) {
                console.log("Background Task Error:", err.message);
            }
        }, 10000); // 10 second loop is safe for battery
    });
});

AppRegistry.registerComponent(appName, () => App);