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

    // If unauthorized, redirect to login (will be handled by auth context)
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('unauthorized'));
    }

    return Promise.reject(new Error(errorMessage));
  }
);

/**
 * Set auth token for all requests
 */
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/**
 * Auth API methods
 */
export const authApi = {
  /**
   * Check if auth is enabled and get current user
   */
  getStatus: async () => {
    const response = await api.get('/auth/status');
    return response.data;
  },

  /**
   * Login
   */
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  /**
   * Logout
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  /**
   * Get current user info
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  }
};

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
   * Update server resource allocation (memory, CPU)
   */
  updateServerResources: async (id, resources) => {
    const response = await api.patch(`/servers/${id}/resources`, resources);
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
   * List saved modpacks across all server types
   */
  listAllModpacks: async () => {
    const response = await api.get('/modpacks');
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
  },

  /**
   * Delete a modpack from the shared library
   */
  deleteSavedModpack: async (type, filename) => {
    const response = await api.delete(`/modpacks/${(type || 'PAPER').toLowerCase()}/${encodeURIComponent(filename)}`);
    return response.data;
  },

  /**
   * Import modpack from URL (CurseForge, Modrinth, etc.)
   */
  importModpackFromUrl: async (url, serverType = null) => {
    const response = await api.post('/modpacks/import', { url, serverType });
    return response.data;
  },

  /**
   * List imported modpacks for a server type
   */
  listImportedModpacks: async (type) => {
    const response = await api.get(`/modpacks/imported/${(type || 'PAPER').toLowerCase()}`);
    return response.data;
  },

  /**
   * Apply a saved modpack to an existing server
   */
  applyModpackToServer: async (serverId, modpackFilename) => {
    const response = await api.post(`/servers/${serverId}/apply-modpack`, { modpackFilename });
    return response.data;
  },

  /**
   * Create a backup for a server
   */
  createBackup: async (id, description = '') => {
    const response = await api.post(`/servers/${id}/backups`, { description });
    return response.data;
  },

  /**
   * List all backups for a server
   */
  listBackups: async (id) => {
    const response = await api.get(`/servers/${id}/backups`);
    return response.data;
  },

  /**
   * Get backup statistics for a server
   */
  getBackupStats: async (id) => {
    const response = await api.get(`/servers/${id}/backups/stats`);
    return response.data;
  },

  /**
   * Get download URL for a backup
   */
  getBackupDownloadUrl: (serverId, backupId) => {
    return `${API_BASE_URL}/servers/${serverId}/backups/${backupId}/download`;
  },

  /**
   * Restore a backup
   */
  restoreBackup: async (serverId, backupId) => {
    const response = await api.post(`/servers/${serverId}/backups/${backupId}/restore`);
    return response.data;
  },

  /**
   * Delete a backup
   */
  deleteBackup: async (serverId, backupId) => {
    const response = await api.delete(`/servers/${serverId}/backups/${backupId}`);
    return response.data;
  },

  /**
   * Get backup schedule for a server
   */
  getBackupSchedule: async (serverId) => {
    const response = await api.get(`/servers/${serverId}/schedule`);
    return response.data;
  },

  /**
   * Create or update backup schedule
   */
  updateBackupSchedule: async (serverId, scheduleData) => {
    const response = await api.post(`/servers/${serverId}/schedule`, scheduleData);
    return response.data;
  },

  /**
   * Delete backup schedule
   */
  deleteBackupSchedule: async (serverId) => {
    const response = await api.delete(`/servers/${serverId}/schedule`);
    return response.data;
  },

  /**
   * Get available backup frequencies
   */
  getBackupFrequencies: async () => {
    const response = await api.get('/schedules/frequencies');
    return response.data;
  },

  /**
   * Get modpack download URL
   */
  getModpackDownloadUrl: (type, filename) => {
    return `${API_BASE_URL}/modpacks/${type.toLowerCase()}/${encodeURIComponent(filename)}/download`;
  },

  /**
   * Recreate the Docker container for a server
   */
  recreateContainer: async (id) => {
    const response = await api.post(`/servers/${id}/recreate`);
    return response.data;
  },

  /**
   * Check if server's container exists
   */
  checkContainerStatus: async (id) => {
    const response = await api.get(`/servers/${id}/container-status`);
    return response.data;
  }
};

/**
 * Mod API methods
 */
export const modApi = {
  /**
   * Get mod search configuration
   */
  getConfig: async () => {
    const response = await api.get('/mods/config');
    return response.data;
  },

  /**
   * Search for mods on CurseForge or Modrinth
   */
  searchMods: async (source, query, gameVersion, modLoader, options = {}) => {
    const params = new URLSearchParams({
      source,
      query,
      ...(gameVersion && { gameVersion }),
      ...(modLoader && { modLoader }),
      ...(options.limit && { limit: options.limit }),
      ...(options.offset && { offset: options.offset })
    });
    const response = await api.get(`/mods/search?${params}`);
    return response.data;
  },

  /**
   * Get available versions for a mod
   */
  getModVersions: async (source, modId, gameVersion, modLoader) => {
    const params = new URLSearchParams({
      ...(gameVersion && { gameVersion }),
      ...(modLoader && { modLoader })
    });
    const response = await api.get(`/mods/${source}/${modId}/versions?${params}`);
    return response.data;
  },

  /**
   * List mods installed on a server
   */
  listServerMods: async (serverId) => {
    const response = await api.get(`/servers/${serverId}/mods`);
    return response.data;
  },

  /**
   * Install a mod from search results
   */
  installModToServer: async (serverId, source, modId, versionId) => {
    const response = await api.post(`/servers/${serverId}/mods/install`, {
      source,
      modId,
      versionId
    });
    return response.data;
  },

  /**
   * Get detailed info for a specific mod
   */
  getModInfo: async (serverId, filename) => {
    const response = await api.get(`/servers/${serverId}/mods/${encodeURIComponent(filename)}/info`);
    return response.data;
  },

  /**
   * Toggle mod enabled/disabled status
   */
  toggleMod: async (serverId, filename) => {
    const response = await api.patch(`/servers/${serverId}/mods/${encodeURIComponent(filename)}/toggle`);
    return response.data;
  },

  /**
   * Delete a mod from a server
   */
  deleteMod: async (serverId, filename) => {
    const response = await api.delete(`/servers/${serverId}/mods/${encodeURIComponent(filename)}`);
    return response.data;
  },

  /**
   * Get download URL for a mod
   */
  getModDownloadUrl: (serverId, filename) => {
    return `${API_BASE_URL}/servers/${serverId}/mods/${encodeURIComponent(filename)}/download`;
  },

  /**
   * Get icon URL for a mod
   */
  getModIconUrl: (serverId, filename) => {
    return `${API_BASE_URL}/servers/${serverId}/mods/${encodeURIComponent(filename)}/icon`;
  }
};

/**
 * Template API methods
 */
export const templateApi = {
  /**
   * List all available compose templates
   */
  listTemplates: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.serverType) params.set('serverType', options.serverType);
    if (options.hasModpack) params.set('hasModpack', 'true');
    if (options.search) params.set('search', options.search);

    const response = await api.get(`/templates?${params}`);
    return response.data;
  },

  /**
   * Get template suggestions based on server configuration
   */
  getSuggestions: async (config = {}) => {
    const params = new URLSearchParams();
    if (config.serverType) params.set('serverType', config.serverType);
    if (config.modpack) params.set('modpack', config.modpack);
    if (config.modpackPlatform) params.set('modpackPlatform', config.modpackPlatform);

    const response = await api.get(`/templates/suggestions?${params}`);
    return response.data;
  },

  /**
   * Get a specific template by ID
   */
  getTemplate: async (id) => {
    const response = await api.get(`/templates/${encodeURIComponent(id)}`);
    return response.data;
  },

  /**
   * Get environment variable reference for a template
   */
  getTemplateEnvVars: async (id) => {
    const response = await api.get(`/templates/${encodeURIComponent(id)}/env`);
    return response.data;
  },

  /**
   * Generate a compose configuration from a template
   */
  generateFromTemplate: async (id, overrides = {}) => {
    const response = await api.post(`/templates/${encodeURIComponent(id)}/generate`, overrides);
    return response.data;
  }
};

/**
 * Player API methods
 */
export const playerApi = {
  /**
   * Get online players for a server
   */
  getOnlinePlayers: async (serverId) => {
    const response = await api.get(`/servers/${serverId}/players`);
    return response.data;
  },

  /**
   * Execute a player action (kick, ban, op, etc.)
   */
  executePlayerAction: async (serverId, action, playerName) => {
    const response = await api.post(`/servers/${serverId}/players/${encodeURIComponent(playerName)}/action`, {
      action
    });
    return response.data;
  }
};

/**
 * Notification API methods
 */
export const notificationApi = {
  /**
   * Get notification settings for a server
   */
  getSettings: async (serverId) => {
    const response = await api.get(`/servers/${serverId}/notifications`);
    return response.data;
  },

  /**
   * Update notification settings for a server
   */
  updateSettings: async (serverId, settings) => {
    const response = await api.put(`/servers/${serverId}/notifications`, settings);
    return response.data;
  },

  /**
   * Test the Discord webhook
   */
  testWebhook: async (serverId, webhookUrl) => {
    const response = await api.post(`/servers/${serverId}/notifications/test`, { webhookUrl });
    return response.data;
  }
};

export default api;
