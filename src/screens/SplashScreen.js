import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start(async () => {
      await checkLoginStatus();
    });
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const user = await AsyncStorage.getItem('user');
      if (token && user) {
        navigation.replace('Home');
      } else {
        navigation.replace('Login');
      }
    } catch (error) {
      console.log('Error Checking auth status', error);
      navigation.replace('Login');
    }
  };
  return (
    <LinearGradient
      // Ensure these match your src/constants/Colors.js exactly
      colors={[
        COLORS.gradientStart || '#2A67FF',
        COLORS.gradientEnd || '#8A20FF',
      ]}
      style={styles.container}
    >
      <View style={styles.centerContent}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Changed style name to subText to match the StyleSheet below */}
        <Text style={styles.subText}>PARENTAL CONTROL SYSTEM</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.7,
    height: 100,
  },
  subText: {
    color: '#FFFFFF', // Using hex directly if COLORS.white is missing
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 10,
  },
  footer: {
    width: '100%',
    paddingHorizontal: 50,
    marginBottom: 80,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
});

export default SplashScreen;
