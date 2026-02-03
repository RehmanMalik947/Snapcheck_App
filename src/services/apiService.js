// src/services/ApiService.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "react-native-config";
// Android Emulator ke liye 10.0.2.2, Physical device ke liye laptop ka IP

const API_URL = config.BASE_API_URL || "https://appbackend.snapcheck.io/api";
class ApiService { 
  constructor() {  
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });  

    // Interceptor: Har request se pehle AsyncStorage se token nikaal kar attach karega
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      return config;
    }, (error) => {
      return Promise.reject(error);
    });
  }

  // Login Method
  async login(data) {
    try {
      const response = await this.api.post("/auth/login", data);
      
      // Agar backend success return kare
      if (response.data.success) {
        const { token, user } = response.data;
        await AsyncStorage.setItem("authToken", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));
      }
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed"
      };
    }
  }

  // Device Info Sync Method
  async syncDeviceData(data) {
    try {
      // Backend route /api/device/sync
      const response = await this.api.post("/device/sync", data);
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Sync failed"
      };
    }
  }

  async getLatestDeviceInfo(userId) {
    try {
      // Backend route: /api/device/latest/:userId
      const response = await this.api.get(`/device/latest/${userId}`);
      return response.data;
    } catch (error) {
      console.log("Get Info Error:", error.message);
      return {
        success: false,
        message: error.response?.data?.message || "Failed to fetch status"
      };
    }
  }

  // Generic methods agar baad mein kisi aur kaam ke liye chahiye hon
  get(path, params = {}) {
    return this.api.get(path, { params });
  }

  post(path, data) {
    return this.api.post(path, data);
  }
}
// Singleton instance export kar rahe hain
export default new ApiService();