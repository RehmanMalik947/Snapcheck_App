// src/screens/LockScreen.js
import React from 'react';
import { View, Text, StyleSheet, Modal, StatusBar } from 'react-native';
import { Smartphone } from 'lucide-react-native'; // Agar lucide icons hain

const LockScreen = ({ visible }) => {
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Text style={{ fontSize: 50 }}>🔒</Text>
        </View>
        <Text style={styles.title}>Device Locked</Text>
        <Text style={styles.message}>Device is locked by your Guardians! </Text>
        <Text style={styles.footerText}>Contact parents for emergency</Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e293b', // Dark slate color (professional)
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
  },
  footerText: {
    position: 'absolute',
    bottom: 50,
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'uppercase',
  },
});

export default LockScreen;