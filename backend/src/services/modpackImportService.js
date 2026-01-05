import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ModpackImportService {
  constructor() {
    this.modpacksBasePath = process.env.MODPACKS_PATH || path.join(__dirname, '../../../data/modpacks');
    this.tempPath = path.join(__dirname, '../../../temp');
    this.supportedTypes = ['PAPER', 'FABRIC', 'FORGE', 'NEOFORGE'];

    // Ensure directories exist
    if (!fs.existsSync(this.modpacksBasePath)) {
      fs.mkdirSync(this.modpacksBasePath, { recursive: true });
    }
    if (!fs.existsSync(this.tempPath)) {
      fs.mkdirSync(this.tempPath, { recursive: true });
    }
  }

  /**
   * Import modpack from URL (CurseForge, Modrinth, or direct download)
   */
  async importFromUrl(url, serverType = null) {
    try {
      logger.info(`Importing modpack from URL: ${url}`);

      // Detect modpack source
      const source = this.detectSource(url);
      let downloadUrl = url;
      let metadata = {
        source: 'direct',
        originalUrl: url
      };

      // Handle CurseForge URLs
      if (source === 'curseforge') {
        metadata = await this.getCurseForgeMetadata(url);
        downloadUrl = metadata.downloadUrl || url;
      }

      // Handle Modrinth URLs
      if (source === 'modrinth') {
        metadata = await this.getModrinthMetadata(url);
        downloadUrl = metadata.downloadUrl || url;
      }

      // Download the modpack
      const tempFile = await this.downloadFile(downloadUrl);

      // Validate and extract metadata from zip
      const zipMetadata = this.extractZipMetadata(tempFile);
      const loaderPreference = this.getLoaderPreference(zipMetadata);
      const requestedType = serverType ? this.normalizeServerType(serverType) : null;

      if (requestedType && loaderPreference && requestedType !== loaderPreference) {
        throw new ValidationError(
          `Modpack appears to target ${loaderPreference}, but ${requestedType} was selected.`
        );
      }

      // Determine server type if not provided
      const detectedType = this.detectServerType(zipMetadata, requestedType || loaderPreference);

      // Save to modpacks library
      const savedPath = await this.saveToLibrary(tempFile, detectedType, {
        ...metadata,
        ...zipMetadata,
        detectedLoader: loaderPreference || null
      });

      // Clean up temp file
      fs.unlinkSync(tempFile);

      logger.info(`Modpack imported successfully: ${savedPath}`);

      return {
        success: true,
        path: savedPath,
        type: detectedType,
        metadata: {
          ...metadata,
          ...zipMetadata
        }
      };
    } catch (error) {
      logger.error(`Failed to import modpack: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect the source of the modpack URL
   */
  detectSource(url) {
    if (url.includes('curseforge.com')) {
      return 'curseforge';
    }
    if (url.includes('modrinth.com')) {
      return 'modrinth';
    }
    return 'direct';
  }

  /**
   * Get CurseForge modpack metadata
   * Note: This is a simplified version - full implementation would use CF API
   */
  async getCurseForgeMetadata(url) {
    try {
      logger.info(`Fetching CurseForge metadata from: ${url}`);

      // For now, return basic metadata
      // Full implementation would parse the project ID and use the CF API
      return {
        source: 'curseforge',
        originalUrl: url,
        name: this.extractNameFromUrl(url),
        downloadUrl: url // Would be replaced with actual download URL from API
      };
    } catch (error) {
      logger.warn(`Failed to fetch CurseForge metadata: ${error.message}`);
      return {
        source: 'curseforge',
        originalUrl: url
      };
    }
  }

  /**
   * Get Modrinth modpack metadata
   * Modrinth API is more straightforward
   */
  async getModrinthMetadata(url) {
    try {
      logger.info(`Fetching Modrinth metadata from: ${url}`);

      // Extract project slug from URL (e.g., modrinth.com/modpack/fabric-example)
      const match = url.match(/modrinth\.com\/modpack\/([^\/\?]+)/);
      if (match) {
        const slug = match[1];

        // Fetch project info from Modrinth API
        const response = await axios.get(`https://api.modrinth.com/v2/project/${slug}`);
        const project = response.data;

        // Get latest version
        const versionsResponse = await axios.get(`https://api.modrinth.com/v2/project/${slug}/version`);
        const versions = versionsResponse.data;

        if (versions.length > 0) {
          const latestVersion = versions[0];
          const primaryFile = latestVersion.files.find(f => f.primary) || latestVersion.files[0];

          return {
            source: 'modrinth',
            originalUrl: url,
            name: project.title,
            description: project.description,
            downloadUrl: primaryFile.url,
            fileName: primaryFile.filename,
            version: latestVersion.version_number,
            gameVersions: latestVersion.game_versions,
            loaders: latestVersion.loaders
          };
        }
      }

      return {
        source: 'modrinth',
        originalUrl: url
      };
    } catch (error) {
      logger.warn(`Failed to fetch Modrinth metadata: ${error.message}`);
      return {
        source: 'modrinth',
        originalUrl: url
      };
    }
  }

  /**
   * Extract name from URL
   */
  extractNameFromUrl(url) {
    const parts = url.split('/');
    const lastPart = parts[parts.length - 1].split('?')[0];
    return lastPart.replace(/[^a-zA-Z0-9-]/g, '-');
  }

  /**
   * Download file from URL
   */
  async downloadFile(url) {
    try {
      logger.info(`Downloading file from: ${url}`);

      const tempFileName = `modpack-${uuidv4()}.zip`;
      const tempFilePath = path.join(this.tempPath, tempFileName);

      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        timeout: 300000, // 5 minute timeout
        headers: {
          'User-Agent': 'Minecraft-Server-Manager/1.0'
        }
      });

      const writer = fs.createWriteStream(tempFilePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          logger.info(`File downloaded successfully: ${tempFilePath}`);
          resolve(tempFilePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      logger.error(`Failed to download file: ${error.message}`);
      throw new Error(`Failed to download modpack: ${error.message}`);
    }
  }

  /**
   * Extract metadata from zip file
   */
  extractZipMetadata(zipPath) {
    try {
      const zip = new AdmZip(zipPath);
      const entries = zip.getEntries();

      const metadata = {
        fileCount: entries.length,
        hasModsFolder: false,
        hasPluginsFolder: false,
        hasConfigFolder: false,
        hasOverridesFolder: false,
        manifestFound: false,
        loaderHints: []
      };
      const loaderHints = new Set();

      // Check for common modpack structures
      entries.forEach(entry => {
        const entryPath = entry.entryName.toLowerCase();

        this.addLoaderHintFromPath(entryPath, loaderHints);

        if (entryPath.includes('mods/')) metadata.hasModsFolder = true;
        if (entryPath.includes('plugins/')) metadata.hasPluginsFolder = true;
        if (entryPath.includes('config/')) metadata.hasConfigFolder = true;
        if (entryPath.includes('overrides/')) metadata.hasOverridesFolder = true;

        if (entryPath.startsWith('mods/') && entryPath.endsWith('.jar')) {
          this.addLoaderHintFromPath(path.basename(entryPath), loaderHints);
        }

        // Check for CurseForge manifest
        if (entryPath === 'manifest.json') {
          metadata.manifestFound = true;
          try {
            const content = entry.getData().toString('utf8');
            const manifest = JSON.parse(content);
            metadata.manifest = {
              name: manifest.name,
              version: manifest.version,
              author: manifest.author,
              minecraftVersion: manifest.minecraft?.version,
              modLoaders: manifest.minecraft?.modLoaders
            };
          } catch (error) {
            logger.warn('Failed to parse manifest.json');
          }
        }

        // Check for Modrinth index
        if (entryPath === 'modrinth.index.json') {
          metadata.modrinthIndexFound = true;
          try {
            const content = entry.getData().toString('utf8');
            const index = JSON.parse(content);
            metadata.modrinthIndex = {
              name: index.name,
              versionId: index.versionId,
              gameVersion: index.dependencies?.minecraft,
              dependencies: index.dependencies,
              files: Array.isArray(index.files)
                ? index.files.map(file => ({
                  path: file.path,
                  env: file.env
                }))
                : undefined
            };
          } catch (error) {
            logger.warn('Failed to parse modrinth.index.json');
          }
        }
      });

      metadata.loaderHints = Array.from(loaderHints);
      return metadata;
    } catch (error) {
      logger.error(`Failed to extract zip metadata: ${error.message}`);
      throw new ValidationError('Invalid modpack zip file');
    }
  }

  /**
   * Detect server type from metadata
   */
  detectServerType(metadata, preferredType = null) {
    const loaderPreference = preferredType || this.getLoaderPreference(metadata);
    if (loaderPreference) {
      return loaderPreference;
    }

    // Check folder structure
    if (metadata.hasPluginsFolder) return 'PAPER';
    if (metadata.hasModsFolder) return 'FABRIC'; // Default to Fabric when mods folder is present

    return 'PAPER'; // Safe default
  }

  getLoaderPreference(metadata) {
    const hints = new Set(metadata.loaderHints || []);

    if (metadata.modrinthIndex?.dependencies) {
      const deps = metadata.modrinthIndex.dependencies;
      if (deps.neoforge) hints.add('NEOFORGE');
      if (deps.forge) hints.add('FORGE');
      if (deps.fabric) hints.add('FABRIC');
    }

    if (metadata.manifest?.modLoaders) {
      metadata.manifest.modLoaders.forEach(loader => {
        const id = (loader?.id || '').toLowerCase();
        if (id.includes('neoforge')) {
          hints.add('NEOFORGE');
        } else if (id.includes('forge')) {
          hints.add('FORGE');
        } else if (id.includes('fabric')) {
          hints.add('FABRIC');
        }
      });
    }

    if (metadata.modrinthIndex?.files) {
      metadata.modrinthIndex.files.forEach(file => {
        const filePath = file?.path?.toLowerCase();
        if (!filePath) return;
        if (filePath.includes('neoforge')) {
          hints.add('NEOFORGE');
        } else if (filePath.includes('fabric')) {
          hints.add('FABRIC');
        }
      });
    }

    return this.prioritizeLoaderHint(hints);
  }

  prioritizeLoaderHint(hints) {
    if (!hints || hints.size === 0) {
      return null;
    }

    const priority = ['NEOFORGE', 'FORGE', 'FABRIC'];
    return priority.find(type => hints.has(type)) || null;
  }

  addLoaderHintFromPath(entryPath, loaderHints) {
    const lower = entryPath.toLowerCase();
    if (lower.includes('neoforge')) {
      loaderHints.add('NEOFORGE');
    } else if (lower.includes('minecraftforge')) {
      loaderHints.add('FORGE');
    } else if (lower.includes('fabric')) {
      loaderHints.add('FABRIC');
    }
  }

  normalizeServerType(type) {
    if (!type) {
      return null;
    }
    const normalized = String(type).toUpperCase();
    if (!this.supportedTypes.includes(normalized)) {
      throw new ValidationError(`Unsupported server type: ${type}`);
    }
    return normalized;
  }

  /**
   * Save modpack to library
   */
  async saveToLibrary(tempFilePath, serverType, metadata) {
    try {
      const normalizedType = this.normalizeServerType(serverType || 'PAPER');
      const typeDir = path.join(this.modpacksBasePath, normalizedType.toLowerCase());

      if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
      }

      // Generate filename
      const baseName = metadata.name || metadata.manifest?.name || `modpack-${Date.now()}`;
      const safeName = baseName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      const fileName = `${safeName}.zip`;
      const destPath = path.join(typeDir, fileName);

      // Copy file
      fs.copyFileSync(tempFilePath, destPath);

      // Save metadata alongside
      const metadataPath = path.join(typeDir, `${safeName}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify({
        ...metadata,
        importedAt: new Date().toISOString(),
        serverType: normalizedType,
        fileName
      }, null, 2));

      logger.info(`Modpack saved to library: ${destPath}`);

      return fileName;
    } catch (error) {
      logger.error(`Failed to save modpack to library: ${error.message}`);
      throw error;
    }
  }

  /**
   * List imported modpacks
   */
  listImportedModpacks(serverType) {
    try {
      const typeDir = path.join(this.modpacksBasePath, serverType.toLowerCase());

      if (!fs.existsSync(typeDir)) {
        return [];
      }

      const files = fs.readdirSync(typeDir);
      const modpacks = [];

      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const metadataPath = path.join(typeDir, file);
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            modpacks.push(metadata);
          } catch (error) {
            logger.warn(`Failed to read metadata file: ${file}`);
          }
        }
      });

      return modpacks.sort((a, b) =>
        new Date(b.importedAt) - new Date(a.importedAt)
      );
    } catch (error) {
      logger.error(`Failed to list imported modpacks: ${error.message}`);
      return [];
    }
  }
}

// Export singleton instance
export default new ModpackImportService();
