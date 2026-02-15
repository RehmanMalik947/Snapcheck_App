import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🛑 IMPORTANT: Update this to your current laptop IP every time it changes!
const API_URL = 'http://192.168.10.13:3000/api';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Auto-attach token to every request
    this.api.interceptors.request.use(
      async config => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error),
    );
  }

  /**
   * ✅ Re-named to "login" so you don't have to change your LoginScreen.js
   * but it points to the new "child" route.
   */
  // ✅ Corrected version that handles objects
async login(data) { // data is an object: { email, password }
  try {
    const response = await this.api.post('/auth/child/login', data);

    if (response.data && response.data.token) {
      await AsyncStorage.setItem('authToken', response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data));
      return { success: true, data: response.data };
    }
    return { success: false, message: "Authentication failed" };
  } catch (error) {
    console.log("Login Logic Error:", error.response?.data || error.message);
    return {
      success: false,
      // Pass the specific error from the backend if it exists
      message: error.response?.data?.error || error.response?.data?.message || 'Login failed',
    };
  }
}

  // Heartbeat & Usage pulses
  async syncDeviceData(data) {
    try {
      const response = await this.api.post('/device/sync', data);
      return response.data;
    } catch (error) {
      return { success: false };
    }
  }

  async getLatestDeviceInfo(userId) {
    try {
      const response = await this.api.get(`/device/latest/${userId}`);
      return response.data;
    } catch (error) {
      return { success: false };
    }
  }

  async getActivitySummary(userId) {
    try {
      const response = await this.api.get(`/activity/summary/${userId}`);
      return response.data;
    } catch (error) {
      return { success: false };
    }
  }

  // Custom POST helper
  async post(path, data) {
    try {
      const response = await this.api.post(path, data);
      return response.data;
    } catch (error) {
      console.log(`POST ERROR [${path}]:`, error.message);
      return { success: false };
    }
  }

  // Custom GET helper
  async get(path) {
    try {
      const response = await this.api.get(path);
      return response.data;
    } catch (error) {
      console.log(`GET ERROR [${path}]:`, error.message);
      return { success: false };
    }
  }
}

export default new ApiService();