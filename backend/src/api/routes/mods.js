import express from 'express';
import fs from 'fs';
import modSearchService from '../../services/modSearchService.js';
import modManagementService from '../../services/modManagementService.js';
import modDependencyService from '../../services/modDependencyService.js';
import playerService from '../../services/playerService.js';
import logger from '../../utils/logger.js';
import { ValidationError } from '../../utils/errors.js';
import Server from '../../models/Server.js';

const router = express.Router();

// ============================================
// Mod Search Routes (mounted at /api/mods)
// ============================================

/**
 * GET /api/mods/search
 * Search for mods on CurseForge or Modrinth
 */
router.get('/search', async (req, res, next) => {
  try {
    const {
      source = 'modrinth',
      query,
      gameVersion,
      modLoader,
      limit = 20,
      offset = 0
    } = req.query;

    if (!query) {
      throw new ValidationError('query parameter is required');
    }

    const results = await modSearchService.searchMods(
      source,
      query,
      gameVersion,
      modLoader,
      { limit: parseInt(limit), offset: parseInt(offset) }
    );

    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/mods/config
 * Get mod search configuration (e.g., whether CurseForge is configured)
 */
router.get('/config', async (req, res, next) => {
  try {
    res.json({
      curseForgeConfigured: modSearchService.isCurseForgeConfigured(),
      sources: modSearchService.isCurseForgeConfigured()
        ? ['modrinth', 'curseforge']
        : ['modrinth']
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/mods/:source/:modId/versions
 * Get available versions for a mod
 */
router.get('/:source/:modId/versions', async (req, res, next) => {
  try {
    const { source, modId } = req.params;
    const { gameVersion, modLoader } = req.query;

    const versions = await modSearchService.getModVersions(
      source,
      modId,
      gameVersion,
      modLoader
    );

    res.json({ versions });
  } catch (error) {
    next(error);
  }
});

// ============================================
// Server Mod Routes (to be mounted at /api/servers)
// ============================================

/**
 * Create a separate router for server-specific mod routes
 * These will be mounted at /api/servers/:id/mods
 */
export const serverModsRouter = express.Router({ mergeParams: true });

/**
 * GET /api/servers/:id/mods
 * List all mods installed on a server
 */
serverModsRouter.get('/', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await modManagementService.listServerMods(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/servers/:id/mods/install
 * Install a mod from CurseForge/Modrinth search
 */
serverModsRouter.post('/install', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { source, modId, versionId } = req.body;

    if (!source || !modId || !versionId) {
      throw new ValidationError('source, modId, and versionId are required');
    }

    const result = await modManagementService.installModFromSearch(
      id,
      source,
      modId,
      versionId
    );

    logger.info(`Mod installed via API: ${result.installed} on server ${id}`);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/servers/:id/mods/check-install
 * Check compatibility and dependencies before installing (dry-run)
 */
serverModsRouter.post('/check-install', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { source, modId, versionId } = req.body;

    if (!source || !modId || !versionId) {
      throw new ValidationError('source, modId, and versionId are required');
    }

    const server = Server.findById(id);
    if (!server) {
      throw new ValidationError(`Server not found: ${id}`);
    }

    // Build server context
    const serverContext = {
      serverId: id,
      serverVersion: server.version,
      serverType: server.type,
      serverMemory: server.memory
    };

    // Get full version details
    const versionData = await modSearchService.getVersionDetails(source, versionId);
    if (!versionData) {
      throw new ValidationError(`Version not found: ${versionId}`);
    }

    // Resolve dependencies
    const dependencyTree = await modDependencyService.resolveDependencies(
      source,
      versionId,
      serverContext
    );

    // Check compatibility
    const compatibilityCheck = await modDependencyService.checkCompatibility(
      source,
      modId,
      versionData,
      serverContext
    );

    // Detect conflicts
    const conflicts = await modDependencyService.detectConflicts(id, versionData, dependencyTree);

    res.json({
      modId,
      versionId,
      source,
      compatible: compatibilityCheck.compatible,
      warnings: [...compatibilityCheck.warnings, ...compatibilityCheck.resourceConcerns],
      dependencies: dependencyTree,
      conflicts
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/servers/:id/mods/:filename/info
 * Get detailed information about a specific mod
 */
serverModsRouter.get('/:filename/info', async (req, res, next) => {
  try {
    const { id, filename } = req.params;
    const modInfo = await modManagementService.getModInfo(id, decodeURIComponent(filename));

    res.json(modInfo);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/servers/:id/mods/:filename/dependencies
 * Get dependency information for an installed mod
 */
serverModsRouter.get('/:filename/dependencies', async (req, res, next) => {
  try {
    const { id, filename } = req.params;
    const depInfo = await modDependencyService.getInstalledModDependencies(
      id,
      decodeURIComponent(filename)
    );

    if (!depInfo) {
      return res.status(404).json({ error: { message: 'Mod not found', code: 'NotFound' } });
    }

    res.json(depInfo);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/servers/:id/mods/:filename/toggle
 * Toggle mod enabled/disabled status
 */
serverModsRouter.patch('/:filename/toggle', async (req, res, next) => {
  try {
    const { id, filename } = req.params;
    const result = await modManagementService.toggleMod(id, decodeURIComponent(filename));

    logger.info(`Mod toggled via API: ${filename} on server ${id}`);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/servers/:id/mods/:filename
 * Delete a mod from the server
 */
serverModsRouter.delete('/:filename', async (req, res, next) => {
  try {
    const { id, filename } = req.params;
    const result = await modManagementService.deleteMod(id, decodeURIComponent(filename));

    logger.info(`Mod deleted via API: ${filename} from server ${id}`);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/servers/:id/mods/:filename/download
 * Download a mod JAR file
 */
serverModsRouter.get('/:filename/download', async (req, res, next) => {
  try {
    const { id, filename } = req.params;
    const { filePath, safeFilename } = await modManagementService.getModFilePath(id, decodeURIComponent(filename));

    res.setHeader('Content-Type', 'application/java-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/servers/:id/mods/:filename/icon
 * Get mod icon if available (extracted from JAR)
 */
serverModsRouter.get('/:filename/icon', async (req, res, next) => {
  try {
    const { id, filename } = req.params;
    const iconData = await modManagementService.getModIcon(id, decodeURIComponent(filename));

    if (!iconData) {
      return res.status(404).json({ error: { message: 'No icon available', code: 'NotFound' } });
    }

    res.setHeader('Content-Type', iconData.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(iconData.buffer);
  } catch (error) {
    next(error);
  }
});

// ============================================
// Player Routes (to be mounted at /api/servers)
// ============================================

export const serverPlayersRouter = express.Router({ mergeParams: true });

/**
 * GET /api/servers/:id/players
 * Get online players for a server
 */
serverPlayersRouter.get('/', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await playerService.getOnlinePlayers(id);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Default export is the mod search router
export default router;
