import { NativeModules, Platform } from 'react-native';
const { UsageModule } = NativeModules;

export const getDeviceUsageStats = async () => {
    try {
        if (Platform.OS !== 'android' || !UsageModule) return [];

        // 1. Native bridge se data nikaalo
        const rawData = await UsageModule.getUsageData();
        if (!rawData || !Array.isArray(rawData)) return [];

        return rawData.map(app => {
            // ✅ FIX 1: LOWERCASE PACKAGE (Icon URLs isi par chaltay hain)
            const pkg = app.packageName ? app.packageName.toLowerCase() : "";
            
            // ✅ FIX 2: APP NAME (Agar Unknown ho toh logic use karein)
            let finalName = app.appName;

            if (!finalName || finalName === "Unknown" || finalName === "") {
                // e.g com.whatsapp -> whatsapp -> WhatsApp
                const parts = pkg.split('.');
                let extractedName = parts[parts.length - 1]; 
                finalName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1);
            }

            const totalMins = Math.floor(app.totalTime / 60000);
            const hrs = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            const displayTime = hrs > 0 ? `${hrs} hrs ${mins} min` : `${mins} min`;

            return {
                appName: finalName,
                packageName: pkg,
                // Dashboard side auto-find icon for quality
                appIcon: `https://unavatar.io/google-play/${pkg}`, 
                usageMinutes: totalMins,
                usageTime: displayTime,
            };
        })
        .filter(app => app.usageMinutes > 0 && app.packageName !== 'com.parental.snapcheck') 
        .sort((a, b) => b.usageMinutes - a.usageMinutes);

    } catch (e) {
        console.log("Usage calculation failed:", e.message);
        return [];
    }
};