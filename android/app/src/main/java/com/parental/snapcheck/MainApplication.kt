package com.parental.snapcheck
import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // ✅ APNA MANUAL PACKAGE YAHAN REGISTER KAREIN:
          add(UsagePackage()) 
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    // Native modules linkage aur React Host startup
    loadReactNative(this)
  }
}