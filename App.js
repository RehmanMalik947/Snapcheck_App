import React from 'react';
// Import View, Text, AND StatusBar from 'react-native'
import { View, Text, StatusBar } from 'react-native';
// Remove StatusBar from here
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      {/*
         Note: For a Splash screen with a background color/gradient, 
         you might want to use View instead of SafeAreaView or set 
         the SafeAreaView background to match the gradient start color 
      */}
      <View style={{ flex: 1, backgroundColor: '#2A67FF' }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={true}
        />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
