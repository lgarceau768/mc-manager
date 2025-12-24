import axios from 'axios';

// Use relative URL so Nginx can proxy to backend
// In Docker: /api -> nginx -> backend:3001/api
// In dev: /api -> vite proxy -> localhost:3001/api
const API_BASE_URL = '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const errorMessage = error.response?.data?.error?.message || error.message || 'An error occurred';
    console.error('API Error:', errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
);

/**
 * Server API methods
 */
export const serverApi = {
  /**
   * Get all servers
   */
  getServers: async () => {
    const response = await api.get('/servers');
    return response.data;
  },

  /**
   * Get server by ID
   */
  getServer: async (id) => {
    const response = await api.get(`/servers/${id}`);
    return response.data;
  },

  /**
   * Create new server
   */
  createServer: async (serverData) => {
    const response = await api.post('/servers', serverData);
    return response.data;
  },

  /**
   * Start server
   */
  startServer: async (id) => {
    const response = await api.post(`/servers/${id}/start`);
    return response.data;
  },

  /**
   * Stop server
   */
  stopServer: async (id) => {
    const response = await api.post(`/servers/${id}/stop`);
    return response.data;
  },

  /**
   * Restart server
   */
  restartServer: async (id) => {
    const response = await api.post(`/servers/${id}/restart`);
    return response.data;
  },

  /**
   * Delete server
   */
  deleteServer: async (id) => {
    const response = await api.delete(`/servers/${id}`);
    return response.data;
  },

  /**
   * Get server logs
   */
  getServerLogs: async (id, tail = 100) => {
    const response = await api.get(`/servers/${id}/logs?tail=${tail}`);
    return response.data;
  }
};

export default api;
