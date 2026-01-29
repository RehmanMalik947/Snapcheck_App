package com.snapcheck;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

// Class ka naam change kar diya taake conflict na ho
public class MyDeviceAdminReceiver extends DeviceAdminReceiver {
    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Toast.makeText(context, "SnapCheck Protection Active", Toast.LENGTH_SHORT).show();
    }
}