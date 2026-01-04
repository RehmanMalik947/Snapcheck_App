import DeviceInfo from 'react-native-device-info';
import NetInfo from "@react-native-community/netinfo";
import { PermissionsAndroid, Platform } from 'react-native';

export const getDeviceDataForConsole = async () => {
    try {
        // 1. Device Model & Battery
        const model = DeviceInfo.getModel();
        const batteryRaw = await DeviceInfo.getBatteryLevel();
        const battery = Math.round(batteryRaw * 100) + '%';
        
        // 2. Unique ID (IMEI ka alternative)
        const uniqueId = await DeviceInfo.getUniqueId();
        
        // 3. Wifi Status
        const netState = await NetInfo.fetch();
        const wifi = netState.type === 'wifi' ? 'ON' : 'OFF';

        // 4. Location Tracker Status (Sirf check kar rahe hain permission hai ya nahi)
        let locationStatus = 'OFF';
        if (Platform.OS === 'android') {
            const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
            locationStatus = hasPermission ? 'GPS' : 'OFF';
        }

        // 5. Current Timestamp (Figma format: 2015-10-19 09:59:33)
        const date = new Date();
        const timestamp = date.toISOString().replace('T', ' ').split('.')[0];

        // Final Object jo hum ne console karwana hai
        const deviceData = {
            "Device Model": model,
            "Unique ID (IMEI)": uniqueId,
            "Battery": battery,
            "Wifi Status": wifi,
            "Location Tracker": locationStatus,
            "Timestamp": timestamp,
            "Plan": "Premium - 12 Months"
        };

        return deviceData;

    } catch (error) {
        console.log("Error fetching device info:", error);
        return null;
    }
};

export const getFigmaDeviceData = async () => {
    try {
        // 1. Device Model & Battery (Added await for battery)
        const deviceModel = await DeviceInfo.getModel();
        const batteryRaw = await DeviceInfo.getBatteryLevel();
        const battery = Math.round(batteryRaw * 100) + '%';
        
        // 2. Unique ID (Added await - newer versions require this)
        const uniqueId = await DeviceInfo.getUniqueId();
        
        // 3. Wifi Status
        const netState = await NetInfo.fetch();
        const wifiStatus = netState.type === 'wifi' ? 'ON' : 'OFF';

        // 4. Location Tracker Status
        let locationStatus = 'OFF';
        if (Platform.OS === 'android') {
            const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
            locationStatus = hasPermission ? 'GPS' : 'OFF';
        }

        // 5. Current Timestamp (SQL friendly format)
        const date = new Date();
        const deviceTimestamp = date.toISOString().replace('T', ' ').split('.')[0];

        // Final Object: Keys ko Backend ke req.body ke mutabiq set kiya hai
        return {
            deviceModel,
            uniqueId,
            battery,
            wifiStatus,
            locationStatus,
            deviceTimestamp
        };

    } catch (error) {
        console.log("Error fetching device info:", error);
        return null;
    }
};