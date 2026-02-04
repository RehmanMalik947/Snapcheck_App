package com.parental.snapcheck;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import java.util.List;
import java.util.Calendar;
import android.app.ActivityManager;
import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.os.PowerManager;

public class UsageModule extends ReactContextBaseJavaModule {
    UsageModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "UsageModule";
    }

    @ReactMethod
    public void checkPermission(Promise promise) {
        UsageStatsManager mUsageStatsManager = (UsageStatsManager) getReactApplicationContext().getSystemService(Context.USAGE_STATS_SERVICE);
        long time = System.currentTimeMillis();
        List<UsageStats> stats = mUsageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, time - 1000 * 10, time);
        promise.resolve(stats != null && !stats.isEmpty());
    }
 // Import add karein

// 1. Check karein kya battery optimization disabled hai (Unrestricted hai?)
@ReactMethod
public void isBatteryIgnored(Promise promise) {
    String packageName = getReactApplicationContext().getPackageName();
    PowerManager pm = (PowerManager) getReactApplicationContext().getSystemService(Context.POWER_SERVICE);
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
        promise.resolve(pm.isIgnoringBatteryOptimizations(packageName));
    } else {
        promise.resolve(true);
    }
}

// 2. Battery settings wala asali page kholna
@ReactMethod
public void openBatterySettings() {
    Intent intent = new Intent();
    intent.setAction(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getReactApplicationContext().startActivity(intent);
}
    @ReactMethod
    public void openSettings() {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getReactApplicationContext().startActivity(intent);
    }

    

    @ReactMethod
    public void getUsageData(Promise promise) {
        UsageStatsManager usm = (UsageStatsManager) getReactApplicationContext().getSystemService(Context.USAGE_STATS_SERVICE);
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        long start = calendar.getTimeInMillis();
        long end = System.currentTimeMillis();

        List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end);
        WritableArray array = Arguments.createArray();

        if (stats != null) {
            for (UsageStats usageStats : stats) {
                if (usageStats.getTotalTimeInForeground() > 60000) { // 1 min filter
                    WritableMap map = Arguments.createMap();
                    map.putString("packageName", usageStats.getPackageName());
                    map.putDouble("totalTime", (double) usageStats.getTotalTimeInForeground());
                    array.pushMap(map);
                }
            }
        }
        promise.resolve(array);
    }
    //lock method
   
// Function to Disable Kiosk Mode (Release buttons)
@ReactMethod
public void deactivateLock(Promise promise) {
    try {
        final Activity activity = getCurrentActivity();
        if (activity != null) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    activity.stopLockTask();
                    promise.resolve(true);
                }
            });
        }
    } catch (Exception e) {
        promise.reject("Error", e.getMessage());
    }
}
// Logic inside UsageModule class
    
@ReactMethod
public void activateLock(Promise promise) {
    try {
        final Activity activity = getCurrentActivity();
        if (activity != null) {
            DevicePolicyManager dpm = (DevicePolicyManager) activity.getSystemService(Context.DEVICE_POLICY_SERVICE);
            ComponentName adminComponent = new ComponentName(activity, MyDeviceAdminReceiver.class);

            // 🛑 CRITICAL STEP: Whitelist ourselves
            // Yeh line popup window ko hamesha ke liye khatam kar deti hai
            if (dpm.isDeviceOwnerApp(activity.getPackageName())) {
                String[] packages = {activity.getPackageName()};
                dpm.setLockTaskPackages(adminComponent, packages);
            }

            activity.runOnUiThread(() -> {
                try {
                    // Ab ye bina popup ke lock karega!
                    activity.startLockTask();
                    promise.resolve(true);
                } catch (Exception e) {
                    promise.reject("LOCK_ERROR", e.getMessage());
                }
            });
        }
    } catch (Exception e) {
        promise.reject("ERROR", e.getMessage());
    }
}}