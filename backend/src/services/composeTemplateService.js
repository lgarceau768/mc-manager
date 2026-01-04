import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import logger from '../utils/logger.js';

// Import the js-library functions
import {
  listComposeExamples,
  getComposeExample,
  findComposeExamples
} from '../../compose_examples/js-library/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to compose examples
const COMPOSE_EXAMPLES_PATH = path.join(__dirname, '../../compose_examples');

// Server type mappings for filtering
const SERVER_TYPE_KEYWORDS = {
  PAPER: ['paper', 'spigot', 'bukkit'],
  FABRIC: ['fabric'],
  FORGE: ['forge'],
  NEOFORGE: ['neoforge', 'neo-forge'],
  QUILT: ['quilt']
};

// Modpack platform keywords
const MODPACK_PLATFORMS = {
  CURSEFORGE: ['curseforge', 'cf_'],
  MODRINTH: ['modrinth', 'mr_']
};

class ComposeTemplateService {
  constructor() {
    this.templatesCache = null;
    this.cacheExpiry = null;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get all available compose templates
   */
  async listTemplates(options = {}) {
    const templates = await this.getCachedTemplates();

    // Optional filtering
    let filtered = templates;

    if (options.serverType) {
      filtered = this.filterByServerType(filtered, options.serverType);
    }

    if (options.hasModpack) {
      filtered = filtered.filter(t => this.isModpackTemplate(t));
    }

    if (options.search) {
      const search = options.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(search) ||
        t.tags.some(tag => tag.toLowerCase().includes(search)) ||
        (t.description && t.description.toLowerCase().includes(search))
      );
    }

    // Return simplified list for API response
    return filtered.map(t => this.simplifyTemplate(t));
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(identifier) {
    const template = await getComposeExample(identifier, {
      rootDir: COMPOSE_EXAMPLES_PATH,
      includeSource: true,
      includeReadme: true
    });

    if (!template) {
      return null;
    }

    return {
      ...this.simplifyTemplate(template),
      source: template.source,
      compose: template.compose,
      services: template.services
    };
  }

  /**
   * Get template suggestions based on server configuration
   */
  async getSuggestions(config) {
    const { serverType, modpack, modpackPlatform } = config;
    const templates = await this.getCachedTemplates();
    const suggestions = [];

    // If a modpack URL or platform is specified, find modpack templates
    if (modpack || modpackPlatform) {
      const platform = modpackPlatform ||
        (modpack?.includes('curseforge') ? 'CURSEFORGE' : null) ||
        (modpack?.includes('modrinth') ? 'MODRINTH' : null);

      if (platform) {
        const modpackTemplates = templates.filter(t => {
          const keywords = MODPACK_PLATFORMS[platform] || [];
          return keywords.some(kw =>
            t.relativePath.toLowerCase().includes(kw) ||
            t.tags.some(tag => tag.toLowerCase().includes(kw))
          );
        });

        suggestions.push(...modpackTemplates.slice(0, 5).map(t => ({
          ...this.simplifyTemplate(t),
          matchReason: `${platform} modpack template`
        })));
      }
    }

    // Find templates matching server type
    if (serverType) {
      const typeTemplates = this.filterByServerType(templates, serverType)
        .filter(t => !suggestions.some(s => s.id === t.id));

      suggestions.push(...typeTemplates.slice(0, 3).map(t => ({
        ...this.simplifyTemplate(t),
        matchReason: `${serverType} server template`
      })));
    }

    // Add some general/simple templates if we don't have many suggestions
    if (suggestions.length < 3) {
      const simpleTemplates = templates
        .filter(t =>
          t.relativePath.includes('docker-compose-simple') ||
          t.relativePath === 'docker-compose.yml' ||
          t.tags.includes('paper')
        )
        .filter(t => !suggestions.some(s => s.id === t.id));

      suggestions.push(...simpleTemplates.slice(0, 2).map(t => ({
        ...this.simplifyTemplate(t),
        matchReason: 'Basic template'
      })));
    }

    return suggestions.slice(0, 8);
  }

  /**
   * Generate a compose configuration from a template
   */
  async generateFromTemplate(templateId, overrides = {}) {
    const template = await this.getTemplate(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Clone the compose object
    const compose = JSON.parse(JSON.stringify(template.compose));

    // Apply overrides
    const { serverName, port, memory, version, type, modpackUrl } = overrides;

    // Find the main minecraft service
    const serviceNames = Object.keys(compose.services);
    const mcServiceName = serviceNames.find(name =>
      name === 'minecraft' || name === 'mc' || name.includes('minecraft')
    ) || serviceNames[0];

    const service = compose.services[mcServiceName];

    if (service) {
      // Ensure environment object exists
      if (!service.environment) {
        service.environment = {};
      }

      // Convert array environment to object if needed
      if (Array.isArray(service.environment)) {
        const envObj = {};
        service.environment.forEach(entry => {
          if (typeof entry === 'string') {
            const [key, ...rest] = entry.split('=');
            envObj[key] = rest.join('=');
          }
        });
        service.environment = envObj;
      }

      // Apply overrides
      if (serverName) {
        service.environment.SERVER_NAME = serverName;
      }

      if (memory) {
        service.environment.MEMORY = memory;
      }

      if (version) {
        service.environment.VERSION = version;
      }

      if (type) {
        service.environment.TYPE = type;
      }

      if (modpackUrl) {
        // Detect platform and set appropriate env vars
        if (modpackUrl.includes('curseforge')) {
          service.environment.MODPACK_PLATFORM = 'AUTO_CURSEFORGE';
          service.environment.CF_PAGE_URL = modpackUrl;
        } else if (modpackUrl.includes('modrinth')) {
          service.environment.MODPACK_PLATFORM = 'MODRINTH';
          service.environment.MODRINTH_MODPACK = modpackUrl;
        }
      }

      // Update port if specified
      if (port && service.ports) {
        service.ports = service.ports.map(p => {
          if (typeof p === 'string') {
            // Parse and update published port
            const parts = p.split(':');
            if (parts.length === 2) {
              return `${port}:${parts[1]}`;
            }
          } else if (p && typeof p === 'object') {
            return { ...p, published: port };
          }
          return p;
        });
      }

      // Ensure EULA is accepted
      service.environment.EULA = 'TRUE';
    }

    return {
      templateId,
      templateName: template.name,
      compose,
      yaml: YAML.stringify(compose)
    };
  }

  /**
   * Get environment variable reference for a template
   */
  async getTemplateEnvVars(templateId) {
    const template = await this.getTemplate(templateId);

    if (!template) {
      return null;
    }

    const envVars = [];

    for (const service of template.services) {
      for (const [key, value] of Object.entries(service.environment || {})) {
        // Check if value references an env var
        const isReference = typeof value === 'string' &&
          (value.includes('${') || value.startsWith('$'));

        envVars.push({
          key,
          value,
          service: service.name,
          isReference,
          description: this.getEnvVarDescription(key)
        });
      }
    }

    return envVars;
  }

  /**
   * Get cached templates or refresh cache
   */
  async getCachedTemplates() {
    const now = Date.now();

    if (this.templatesCache && this.cacheExpiry && now < this.cacheExpiry) {
      return this.templatesCache;
    }

    try {
      logger.info('Loading compose templates...');
      this.templatesCache = await listComposeExamples({
        rootDir: COMPOSE_EXAMPLES_PATH,
        includeSource: false,
        includeReadme: true
      });
      this.cacheExpiry = now + this.cacheTTL;
      logger.info(`Loaded ${this.templatesCache.length} compose templates`);
    } catch (error) {
      logger.error(`Failed to load compose templates: ${error.message}`);
      this.templatesCache = [];
    }

    return this.templatesCache;
  }

  /**
   * Clear the template cache
   */
  clearCache() {
    this.templatesCache = null;
    this.cacheExpiry = null;
  }

  /**
   * Filter templates by server type
   */
  filterByServerType(templates, serverType) {
    const keywords = SERVER_TYPE_KEYWORDS[serverType.toUpperCase()] || [];

    if (keywords.length === 0) {
      return templates;
    }

    return templates.filter(template => {
      // Check if any service uses the server type
      const hasTypeEnv = template.services.some(service => {
        const typeEnv = service.environment?.TYPE;
        return typeEnv && keywords.some(kw =>
          typeEnv.toLowerCase().includes(kw)
        );
      });

      if (hasTypeEnv) return true;

      // Check tags and path
      return keywords.some(kw =>
        template.tags.some(tag => tag.toLowerCase().includes(kw)) ||
        template.relativePath.toLowerCase().includes(kw)
      );
    });
  }

  /**
   * Check if template is for a modpack
   */
  isModpackTemplate(template) {
    const modpackKeywords = [
      'modpack', 'curseforge', 'modrinth', 'atm', 'ftb',
      'sky factory', 'rlcraft', 'valhelsia', 'prominence'
    ];

    return modpackKeywords.some(kw =>
      template.relativePath.toLowerCase().includes(kw) ||
      template.tags.some(tag => tag.toLowerCase().includes(kw)) ||
      (template.description && template.description.toLowerCase().includes(kw))
    );
  }

  /**
   * Simplify template for API response
   */
  simplifyTemplate(template) {
    // Extract key environment variables
    const mainService = template.services.find(s =>
      s.image?.includes('minecraft') || s.name === 'mc' || s.name === 'minecraft'
    ) || template.services[0];

    const env = mainService?.environment || {};

    return {
      id: template.id,
      name: template.name,
      relativePath: template.relativePath,
      tags: template.tags,
      description: template.description,
      serviceCount: template.serviceCount,
      serverType: env.TYPE || this.inferServerType(template),
      memory: env.MEMORY || null,
      modpackPlatform: env.MODPACK_PLATFORM || null,
      isModpack: this.isModpackTemplate(template)
    };
  }

  /**
   * Infer server type from template
   */
  inferServerType(template) {
    const path = template.relativePath.toLowerCase();
    const tags = template.tags.map(t => t.toLowerCase());

    if (path.includes('paper') || tags.includes('paper')) return 'PAPER';
    if (path.includes('fabric') || tags.includes('fabric')) return 'FABRIC';
    if (path.includes('neoforge') || tags.includes('neoforge')) return 'NEOFORGE';
    if (path.includes('forge') || tags.includes('forge')) return 'FORGE';
    if (path.includes('quilt') || tags.includes('quilt')) return 'QUILT';
    if (path.includes('spigot') || tags.includes('spigot')) return 'SPIGOT';

    return null;
  }

  /**
   * Get description for common environment variables
   */
  getEnvVarDescription(key) {
    const descriptions = {
      EULA: 'Accept Minecraft EULA (required)',
      TYPE: 'Server type (PAPER, FORGE, FABRIC, etc.)',
      VERSION: 'Minecraft version',
      MEMORY: 'Memory allocation (e.g., 4G)',
      SERVER_NAME: 'Server display name',
      MODPACK_PLATFORM: 'Modpack platform (AUTO_CURSEFORGE, MODRINTH)',
      CF_PAGE_URL: 'CurseForge modpack page URL',
      CF_API_KEY: 'CurseForge API key',
      MODRINTH_MODPACK: 'Modrinth modpack slug or URL',
      ONLINE_MODE: 'Require Mojang authentication',
      DIFFICULTY: 'Game difficulty (peaceful, easy, normal, hard)',
      MODE: 'Game mode (survival, creative, adventure, spectator)',
      MOTD: 'Server message of the day',
      MAX_PLAYERS: 'Maximum player count',
      ENABLE_RCON: 'Enable RCON protocol',
      RCON_PASSWORD: 'RCON password',
      SPAWN_PROTECTION: 'Spawn protection radius',
      VIEW_DISTANCE: 'View distance in chunks',
      OPS: 'Comma-separated list of operator usernames',
      WHITELIST: 'Comma-separated list of whitelisted usernames'
    };

    return descriptions[key] || null;
  }
}

// Export singleton instance
export default new ComposeTemplateService();
