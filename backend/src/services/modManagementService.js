import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import Server from '../models/Server.js';
import modSearchService from './modSearchService.js';
import logger from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ModManagementService {
  constructor() {
    this.serversDataPath = process.env.SERVERS_DATA_PATH || path.join(__dirname, '../../../data/servers');
  }

  /**
   * Get the mods/plugins directory for a server based on its type
   */
  getModsDirectory(serverId, serverType) {
    const volumePath = path.join(this.serversDataPath, serverId);

    // Paper/Spigot/Bukkit use 'plugins', Forge/Fabric/NeoForge use 'mods'
    const modsFolderName = serverType === 'PAPER' ? 'plugins' : 'mods';
    return path.join(volumePath, modsFolderName);
  }

  /**
   * List all mods installed on a server
   */
  async listServerMods(serverId) {
    const server = Server.findById(serverId);
    if (!server) {
      throw new NotFoundError(`Server not found: ${serverId}`);
    }

    const modsDir = this.getModsDirectory(serverId, server.type);

    if (!fs.existsSync(modsDir)) {
      return { mods: [], serverType: server.type };
    }

    const files = fs.readdirSync(modsDir);
    const mods = [];

    for (const file of files) {
      const filePath = path.join(modsDir, file);
      const stats = fs.statSync(filePath);

      // Only process .jar files (enabled) and .jar.disabled files (disabled)
      if (stats.isFile() && (file.endsWith('.jar') || file.endsWith('.jar.disabled'))) {
        const enabled = file.endsWith('.jar');
        const baseName = enabled ? file : file.replace('.disabled', '');

        let modInfo = {
          filename: file,
          enabled,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString()
        };

        // Try to extract mod info from JAR
        try {
          const jarPath = filePath;
          const extractedInfo = this.extractModInfo(jarPath);
          modInfo = { ...modInfo, ...extractedInfo };
        } catch (error) {
          // If we can't extract info, just use filename as name
          modInfo.name = baseName.replace('.jar', '');
          logger.debug(`Could not extract mod info from ${file}: ${error.message}`);
        }

        mods.push(modInfo);
      }
    }

    // Sort by name
    mods.sort((a, b) => (a.name || a.filename).localeCompare(b.name || b.filename));

    return { mods, serverType: server.type };
  }

  /**
   * Toggle mod enabled/disabled status
   */
  async toggleMod(serverId, filename) {
    const server = Server.findById(serverId);
    if (!server) {
      throw new NotFoundError(`Server not found: ${serverId}`);
    }

    // Warn if server is running
    if (server.status === 'running') {
      throw new ValidationError('Cannot toggle mods while server is running. Stop the server first.');
    }

    const modsDir = this.getModsDirectory(serverId, server.type);
    const filePath = path.join(modsDir, filename);

    // Security: prevent path traversal
    if (!filePath.startsWith(modsDir)) {
      throw new ValidationError('Invalid filename');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`Mod not found: ${filename}`);
    }

    let newFilename;
    let newEnabled;

    if (filename.endsWith('.jar.disabled')) {
      // Enable the mod
      newFilename = filename.replace('.disabled', '');
      newEnabled = true;
    } else if (filename.endsWith('.jar')) {
      // Disable the mod
      newFilename = filename + '.disabled';
      newEnabled = false;
    } else {
      throw new ValidationError('Invalid mod file format');
    }

    const newFilePath = path.join(modsDir, newFilename);

    // Check if target already exists
    if (fs.existsSync(newFilePath)) {
      throw new ValidationError(`Cannot toggle: ${newFilename} already exists`);
    }

    fs.renameSync(filePath, newFilePath);

    logger.info(`Toggled mod ${filename} -> ${newFilename} on server ${serverId}`);

    return {
      filename: newFilename,
      enabled: newEnabled
    };
  }

  /**
   * Delete a mod from server
   */
  async deleteMod(serverId, filename) {
    const server = Server.findById(serverId);
    if (!server) {
      throw new NotFoundError(`Server not found: ${serverId}`);
    }

    // Warn if server is running
    if (server.status === 'running') {
      throw new ValidationError('Cannot delete mods while server is running. Stop the server first.');
    }

    const modsDir = this.getModsDirectory(serverId, server.type);
    const filePath = path.join(modsDir, filename);

    // Security: prevent path traversal
    if (!filePath.startsWith(modsDir)) {
      throw new ValidationError('Invalid filename');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`Mod not found: ${filename}`);
    }

    // Validate it's actually a mod file
    if (!filename.endsWith('.jar') && !filename.endsWith('.jar.disabled')) {
      throw new ValidationError('Invalid mod file format');
    }

    fs.unlinkSync(filePath);

    logger.info(`Deleted mod ${filename} from server ${serverId}`);

    return { deleted: filename };
  }

  /**
   * Install a mod from search results
   */
  async installModFromSearch(serverId, source, modId, versionId) {
    const server = Server.findById(serverId);
    if (!server) {
      throw new NotFoundError(`Server not found: ${serverId}`);
    }

    // Get mod versions
    const versions = await modSearchService.getModVersions(
      source,
      modId,
      server.version,
      this.getModLoader(server.type)
    );

    // Find the requested version
    const version = versions.find(v => v.id.toString() === versionId.toString());
    if (!version) {
      throw new NotFoundError(`Version not found: ${versionId}`);
    }

    if (!version.downloadUrl) {
      throw new ValidationError('No download URL available for this version');
    }

    // Download the mod
    const tempFilePath = await modSearchService.downloadModFile(version.downloadUrl, version.filename);

    try {
      // Install to server
      await this.installMod(serverId, tempFilePath, version.filename);

      return {
        installed: version.filename,
        modId,
        versionId,
        source
      };
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  }

  /**
   * Install a mod file to a server
   */
  async installMod(serverId, sourceFilePath, filename) {
    const server = Server.findById(serverId);
    if (!server) {
      throw new NotFoundError(`Server not found: ${serverId}`);
    }

    const modsDir = this.getModsDirectory(serverId, server.type);

    // Ensure mods directory exists
    if (!fs.existsSync(modsDir)) {
      fs.mkdirSync(modsDir, { recursive: true });
    }

    // Sanitize filename
    const safeFilename = this.sanitizeFilename(filename);
    const destPath = path.join(modsDir, safeFilename);

    // Check if file already exists
    if (fs.existsSync(destPath)) {
      throw new ValidationError(`Mod already exists: ${safeFilename}`);
    }

    // Copy file
    fs.copyFileSync(sourceFilePath, destPath);

    logger.info(`Installed mod ${safeFilename} to server ${serverId}`);

    return { installed: safeFilename };
  }

  /**
   * Get mod info for a specific file
   */
  async getModInfo(serverId, filename) {
    const server = Server.findById(serverId);
    if (!server) {
      throw new NotFoundError(`Server not found: ${serverId}`);
    }

    const modsDir = this.getModsDirectory(serverId, server.type);
    const filePath = path.join(modsDir, filename);

    // Security: prevent path traversal
    if (!filePath.startsWith(modsDir)) {
      throw new ValidationError('Invalid filename');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError(`Mod not found: ${filename}`);
    }

    const stats = fs.statSync(filePath);
    const enabled = filename.endsWith('.jar');

    let modInfo = {
      filename,
      enabled,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString()
    };

    try {
      const extractedInfo = this.extractModInfo(filePath);
      modInfo = { ...modInfo, ...extractedInfo };
    } catch (error) {
      modInfo.name = filename.replace('.jar', '').replace('.disabled', '');
      modInfo.extractionError = error.message;
    }

    return modInfo;
  }

  /**
   * Extract mod information from JAR file
   */
  extractModInfo(jarPath) {
    const zip = new AdmZip(jarPath);

    // Try Forge/NeoForge (mods.toml)
    const modsToml = zip.getEntry('META-INF/mods.toml');
    if (modsToml) {
      return this.parseModsToml(modsToml.getData().toString('utf8'));
    }

    // Try Fabric (fabric.mod.json)
    const fabricJson = zip.getEntry('fabric.mod.json');
    if (fabricJson) {
      return this.parseFabricModJson(fabricJson.getData().toString('utf8'));
    }

    // Try Paper/Spigot/Bukkit (plugin.yml)
    const pluginYml = zip.getEntry('plugin.yml');
    if (pluginYml) {
      return this.parsePluginYml(pluginYml.getData().toString('utf8'));
    }

    // Try legacy Forge (mcmod.info)
    const mcmodInfo = zip.getEntry('mcmod.info');
    if (mcmodInfo) {
      return this.parseMcmodInfo(mcmodInfo.getData().toString('utf8'));
    }

    // Fallback to filename
    return {
      name: path.basename(jarPath, '.jar').replace('.disabled', ''),
      source: 'filename'
    };
  }

  /**
   * Parse Forge/NeoForge mods.toml
   */
  parseModsToml(content) {
    // Simple TOML parsing for mods.toml
    // The [[mods]] section contains mod info
    const info = { source: 'mods.toml' };

    // Extract modId
    const modIdMatch = content.match(/modId\s*=\s*"([^"]+)"/);
    if (modIdMatch) info.modId = modIdMatch[1];

    // Extract version
    const versionMatch = content.match(/version\s*=\s*"([^"]+)"/);
    if (versionMatch) info.version = versionMatch[1];

    // Extract displayName
    const displayNameMatch = content.match(/displayName\s*=\s*"([^"]+)"/);
    if (displayNameMatch) info.name = displayNameMatch[1];

    // Extract description (can be multiline)
    const descMatch = content.match(/description\s*=\s*'''([^']+)'''/s) ||
                      content.match(/description\s*=\s*"([^"]+)"/);
    if (descMatch) info.description = descMatch[1].trim();

    // Extract authors
    const authorsMatch = content.match(/authors\s*=\s*"([^"]+)"/);
    if (authorsMatch) info.authors = authorsMatch[1];

    return info;
  }

  /**
   * Parse Fabric fabric.mod.json
   */
  parseFabricModJson(content) {
    try {
      const json = JSON.parse(content);
      return {
        modId: json.id,
        name: json.name,
        version: json.version,
        description: json.description,
        authors: Array.isArray(json.authors)
          ? json.authors.map(a => typeof a === 'string' ? a : a.name).join(', ')
          : json.authors,
        source: 'fabric.mod.json'
      };
    } catch (error) {
      return { source: 'fabric.mod.json', parseError: true };
    }
  }

  /**
   * Parse Paper/Spigot/Bukkit plugin.yml
   */
  parsePluginYml(content) {
    // Simple YAML-like parsing
    const info = { source: 'plugin.yml' };

    const lines = content.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (!key || valueParts.length === 0) continue;

      const value = valueParts.join(':').trim();
      const trimmedKey = key.trim().toLowerCase();

      switch (trimmedKey) {
        case 'name':
          info.name = value;
          break;
        case 'version':
          info.version = value;
          break;
        case 'description':
          info.description = value;
          break;
        case 'author':
          info.authors = value;
          break;
        case 'authors':
          // Handle YAML list
          info.authors = value.replace(/[\[\]]/g, '');
          break;
        case 'main':
          info.mainClass = value;
          break;
        case 'api-version':
          info.apiVersion = value;
          break;
      }
    }

    return info;
  }

  /**
   * Parse legacy Forge mcmod.info
   */
  parseMcmodInfo(content) {
    try {
      const json = JSON.parse(content);
      const mod = Array.isArray(json) ? json[0] : json.modList?.[0] || json;

      return {
        modId: mod.modid,
        name: mod.name,
        version: mod.version,
        description: mod.description,
        authors: Array.isArray(mod.authorList)
          ? mod.authorList.join(', ')
          : mod.authorList,
        source: 'mcmod.info'
      };
    } catch (error) {
      return { source: 'mcmod.info', parseError: true };
    }
  }

  /**
   * Get modloader type from server type
   */
  getModLoader(serverType) {
    const mapping = {
      'FORGE': 'forge',
      'FABRIC': 'fabric',
      'NEOFORGE': 'neoforge',
      'PAPER': null // Paper doesn't use modloaders in the same sense
    };
    return mapping[serverType] || null;
  }

  /**
   * Sanitize filename for safe file system operations
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 255);
  }
}

// Export singleton instance
export default new ModManagementService();
