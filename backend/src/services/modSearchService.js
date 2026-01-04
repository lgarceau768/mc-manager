import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { modSearchCache, modInfoCache } from '../utils/cache.js';
import { curseForgeRateLimiter, modrinthRateLimiter } from '../utils/rateLimiter.js';
import { ValidationError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CurseForge API constants
const CURSEFORGE_API_URL = 'https://api.curseforge.com';
const CURSEFORGE_MINECRAFT_GAME_ID = 432;
const CURSEFORGE_MODS_CLASS_ID = 6;

// Modrinth API constants
const MODRINTH_API_URL = 'https://api.modrinth.com/v2';

// Modloader ID mappings for CurseForge
const CURSEFORGE_MODLOADER_IDS = {
  forge: 1,
  fabric: 4,
  neoforge: 6
};

class ModSearchService {
  constructor() {
    this.curseForgeApiKey = process.env.CURSEFORGE_API_KEY || '';
    this.tempPath = path.join(__dirname, '../../../temp');
    this.userAgent = 'MinecraftServerManager/1.0 (https://github.com/mc-server-manager)';

    // Ensure temp directory exists
    if (!fs.existsSync(this.tempPath)) {
      fs.mkdirSync(this.tempPath, { recursive: true });
    }
  }

  /**
   * Unified search across CurseForge or Modrinth
   */
  async searchMods(source, query, gameVersion, modLoader, options = {}) {
    const { limit = 20, offset = 0 } = options;

    // Check cache
    const cacheKey = `search:${source}:${query}:${gameVersion}:${modLoader}:${limit}:${offset}`;
    const cached = modSearchCache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for mod search: ${cacheKey}`);
      return cached;
    }

    let results;
    if (source === 'curseforge') {
      results = await this.searchCurseForge(query, gameVersion, modLoader, limit, offset);
    } else if (source === 'modrinth') {
      results = await this.searchModrinth(query, gameVersion, modLoader, limit, offset);
    } else {
      throw new ValidationError(`Invalid source: ${source}. Must be 'curseforge' or 'modrinth'`);
    }

    // Cache results
    modSearchCache.set(cacheKey, results);
    return results;
  }

  /**
   * Search CurseForge for mods
   */
  async searchCurseForge(query, gameVersion, modLoader, limit = 20, offset = 0) {
    if (!this.curseForgeApiKey) {
      throw new ValidationError('CurseForge API key not configured. Set CURSEFORGE_API_KEY environment variable.');
    }

    await curseForgeRateLimiter.acquire();

    try {
      const params = {
        gameId: CURSEFORGE_MINECRAFT_GAME_ID,
        classId: CURSEFORGE_MODS_CLASS_ID,
        searchFilter: query,
        pageSize: limit,
        index: offset,
        sortField: 2, // Popularity
        sortOrder: 'desc'
      };

      // Add game version filter if provided
      if (gameVersion) {
        params.gameVersion = gameVersion;
      }

      // Add modloader filter if provided
      if (modLoader && CURSEFORGE_MODLOADER_IDS[modLoader.toLowerCase()]) {
        params.modLoaderType = CURSEFORGE_MODLOADER_IDS[modLoader.toLowerCase()];
      }

      const response = await axios.get(`${CURSEFORGE_API_URL}/v1/mods/search`, {
        params,
        headers: {
          'x-api-key': this.curseForgeApiKey,
          'Accept': 'application/json'
        }
      });

      const data = response.data;

      return {
        source: 'curseforge',
        results: data.data.map(mod => this.normalizeCurseForgeResult(mod)),
        pagination: {
          totalCount: data.pagination?.totalCount || data.data.length,
          limit,
          offset
        }
      };
    } catch (error) {
      logger.error(`CurseForge search failed: ${error.message}`);
      if (error.response?.status === 403) {
        throw new ValidationError('CurseForge API key is invalid or expired');
      }
      throw error;
    }
  }

  /**
   * Search Modrinth for mods
   */
  async searchModrinth(query, gameVersion, modLoader, limit = 20, offset = 0) {
    await modrinthRateLimiter.acquire();

    try {
      // Build facets for filtering
      const facets = [['project_type:mod']];

      if (gameVersion) {
        facets.push([`versions:${gameVersion}`]);
      }

      if (modLoader) {
        facets.push([`categories:${modLoader.toLowerCase()}`]);
      }

      const params = {
        query,
        limit,
        offset,
        facets: JSON.stringify(facets)
      };

      const response = await axios.get(`${MODRINTH_API_URL}/search`, {
        params,
        headers: {
          'User-Agent': this.userAgent
        }
      });

      const data = response.data;

      return {
        source: 'modrinth',
        results: data.hits.map(mod => this.normalizeModrinthResult(mod)),
        pagination: {
          totalCount: data.total_hits,
          limit: data.limit,
          offset: data.offset
        }
      };
    } catch (error) {
      logger.error(`Modrinth search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get mod versions from CurseForge
   */
  async getCurseForgeModVersions(modId, gameVersion, modLoader) {
    if (!this.curseForgeApiKey) {
      throw new ValidationError('CurseForge API key not configured');
    }

    const cacheKey = `cf:versions:${modId}:${gameVersion}:${modLoader}`;
    const cached = modInfoCache.get(cacheKey);
    if (cached) return cached;

    await curseForgeRateLimiter.acquire();

    try {
      const params = {};

      if (gameVersion) {
        params.gameVersion = gameVersion;
      }

      if (modLoader && CURSEFORGE_MODLOADER_IDS[modLoader.toLowerCase()]) {
        params.modLoaderType = CURSEFORGE_MODLOADER_IDS[modLoader.toLowerCase()];
      }

      const response = await axios.get(`${CURSEFORGE_API_URL}/v1/mods/${modId}/files`, {
        params,
        headers: {
          'x-api-key': this.curseForgeApiKey,
          'Accept': 'application/json'
        }
      });

      const versions = response.data.data.map(file => ({
        id: file.id,
        name: file.displayName,
        filename: file.fileName,
        gameVersions: file.gameVersions,
        downloadUrl: file.downloadUrl,
        fileSize: file.fileLength,
        releaseType: this.getCurseForgeReleaseType(file.releaseType),
        uploadedAt: file.fileDate
      }));

      modInfoCache.set(cacheKey, versions);
      return versions;
    } catch (error) {
      logger.error(`Failed to get CurseForge mod versions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get mod versions from Modrinth
   */
  async getModrinthVersions(projectId, gameVersion, modLoader) {
    const cacheKey = `mr:versions:${projectId}:${gameVersion}:${modLoader}`;
    const cached = modInfoCache.get(cacheKey);
    if (cached) return cached;

    await modrinthRateLimiter.acquire();

    try {
      const params = {};

      if (gameVersion) {
        params.game_versions = JSON.stringify([gameVersion]);
      }

      if (modLoader) {
        params.loaders = JSON.stringify([modLoader.toLowerCase()]);
      }

      const response = await axios.get(`${MODRINTH_API_URL}/project/${projectId}/version`, {
        params,
        headers: {
          'User-Agent': this.userAgent
        }
      });

      const versions = response.data.map(version => {
        const primaryFile = version.files.find(f => f.primary) || version.files[0];
        return {
          id: version.id,
          name: version.name,
          versionNumber: version.version_number,
          filename: primaryFile?.filename,
          gameVersions: version.game_versions,
          loaders: version.loaders,
          downloadUrl: primaryFile?.url,
          fileSize: primaryFile?.size,
          releaseType: version.version_type,
          uploadedAt: version.date_published
        };
      });

      modInfoCache.set(cacheKey, versions);
      return versions;
    } catch (error) {
      logger.error(`Failed to get Modrinth versions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get versions for a mod (unified interface)
   */
  async getModVersions(source, modId, gameVersion, modLoader) {
    if (source === 'curseforge') {
      return this.getCurseForgeModVersions(modId, gameVersion, modLoader);
    } else if (source === 'modrinth') {
      return this.getModrinthVersions(modId, gameVersion, modLoader);
    } else {
      throw new ValidationError(`Invalid source: ${source}`);
    }
  }

  /**
   * Download a mod file to temp directory
   */
  async downloadModFile(downloadUrl, filename) {
    try {
      logger.info(`Downloading mod file: ${filename}`);

      const tempFileName = `mod-${uuidv4()}-${filename}`;
      const tempFilePath = path.join(this.tempPath, tempFileName);

      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 300000, // 5 minute timeout
        headers: {
          'User-Agent': this.userAgent
        }
      });

      const writer = fs.createWriteStream(tempFilePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          logger.info(`Mod downloaded successfully: ${tempFilePath}`);
          resolve(tempFilePath);
        });
        writer.on('error', (err) => {
          fs.unlink(tempFilePath, () => {}); // Clean up on error
          reject(err);
        });
      });
    } catch (error) {
      logger.error(`Failed to download mod: ${error.message}`);
      throw new Error(`Failed to download mod: ${error.message}`);
    }
  }

  /**
   * Normalize CurseForge result to common format
   */
  normalizeCurseForgeResult(mod) {
    const logo = mod.logo;
    return {
      id: mod.id.toString(),
      slug: mod.slug,
      name: mod.name,
      description: mod.summary,
      author: mod.authors?.[0]?.name || 'Unknown',
      iconUrl: logo?.thumbnailUrl || logo?.url || null,
      downloads: mod.downloadCount,
      updatedAt: mod.dateModified,
      gameVersions: mod.latestFilesIndexes?.map(f => f.gameVersion) || [],
      categories: mod.categories?.map(c => c.name) || [],
      sourceUrl: mod.links?.websiteUrl || `https://www.curseforge.com/minecraft/mc-mods/${mod.slug}`
    };
  }

  /**
   * Normalize Modrinth result to common format
   */
  normalizeModrinthResult(mod) {
    return {
      id: mod.project_id,
      slug: mod.slug,
      name: mod.title,
      description: mod.description,
      author: mod.author,
      iconUrl: mod.icon_url,
      downloads: mod.downloads,
      updatedAt: mod.date_modified,
      gameVersions: mod.versions || [],
      categories: mod.categories || [],
      sourceUrl: `https://modrinth.com/mod/${mod.slug}`
    };
  }

  /**
   * Convert CurseForge release type ID to string
   */
  getCurseForgeReleaseType(typeId) {
    const types = {
      1: 'release',
      2: 'beta',
      3: 'alpha'
    };
    return types[typeId] || 'unknown';
  }

  /**
   * Check if CurseForge API is configured
   */
  isCurseForgeConfigured() {
    return !!this.curseForgeApiKey;
  }
}

// Export singleton instance
export default new ModSearchService();
