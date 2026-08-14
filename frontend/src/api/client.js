import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:1520/api',
});

apiClient.interceptors.request.use((config) => {
  // sessionStorage is isolated per browser tab, allowing simultaneous role testing.
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
