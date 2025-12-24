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
  },

  /**
   * Upload a mod/plugin or server pack
   */
  uploadMod: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/servers/${id}/mods/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  /**
   * Update server settings (motd, difficulty, etc.)
   */
  updateServerSettings: async (id, settings) => {
    const response = await api.patch(`/servers/${id}/settings`, settings);
    return response.data;
  },

  /**
   * Upload server icon
   */
  uploadServerIcon: async (id, file) => {
    const formData = new FormData();
    formData.append('icon', file);

    const response = await api.post(`/servers/${id}/icon`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  /**
   * List files for a server
   */
  listFiles: async (id, path = '') => {
    const response = await api.get(`/servers/${id}/files`, {
      params: { path }
    });
    return response.data;
  },

  /**
   * Upload file to arbitrary directory
   */
  uploadFile: async (id, directoryPath, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', directoryPath || '');

    const response = await api.post(`/servers/${id}/files/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Get download URL for server file
   */
  getFileDownloadUrl: (id, filePath) => {
    const params = new URLSearchParams();
    if (filePath) {
      params.set('path', filePath);
    }
    return `${API_BASE_URL}/servers/${id}/files/download?${params.toString()}`;
  },

  /**
   * List saved modpacks for a server type
   */
  listSavedModpacks: async (type) => {
    const response = await api.get(`/modpacks/${(type || 'PAPER').toLowerCase()}`);
    return response.data;
  },

  /**
   * Upload a modpack to the shared library
   */
  uploadSavedModpack: async (type, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post(`/modpacks/${(type || 'PAPER').toLowerCase()}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export default api;
