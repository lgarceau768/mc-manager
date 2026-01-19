import db from '../models/db.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import modSearchService from './modSearchService.js';

class ModDependencyService {
  /**
   * Recursively resolve all dependencies for a mod version
   */
  async resolveDependencies(source, versionId, serverContext, visitedVersions = new Set()) {
    const result = {
      direct: [],
      transitive: [],
      warnings: [],
      conflicts: []
    };

    try {
      const versionData = await modSearchService.getVersionDetails(source, versionId);
      if (!versionData || !versionData.dependencies) {
        return result;
      }

      // Prevent circular dependencies
      if (visitedVersions.has(versionId)) {
        result.warnings.push(`Circular dependency detected for version ${versionId}`);
        return result;
      }

      const newVisited = new Set(visitedVersions);
      newVisited.add(versionId);

      for (const dep of versionData.dependencies) {
        // Skip embedded dependencies (already in JAR)
        if (dep.dependency_type === 'embedded') {
          continue;
        }

        // Check if dependency is already installed
        const installed = await this.findInstalledDependency(
          serverContext.serverId,
          dep.project_id,
          dep.version_id
        );

        if (installed) {
          if (dep.dependency_type === 'required') {
            result.direct.push({
              projectId: dep.project_id,
              versionId: dep.version_id,
              type: 'required',
              alreadyInstalled: true,
              installedModId: installed.id
            });
          }
          continue;
        }

        // Find compatible version if specific version not provided
        let targetVersionId = dep.version_id;
        if (!targetVersionId) {
          targetVersionId = await this.findCompatibleVersion(source, dep.project_id, serverContext);
          if (!targetVersionId) {
            result.warnings.push(
              `Could not find compatible version for dependency ${dep.project_id}`
            );
            continue;
          }
        }

        const depInfo = {
          projectId: dep.project_id,
          versionId: targetVersionId,
          type: dep.dependency_type,
          alreadyInstalled: false
        };

        if (dep.dependency_type === 'required') {
          result.direct.push(depInfo);

          // Recursively resolve transitive dependencies
          if (dep.dependency_type !== 'optional') {
            const transitive = await this.resolveDependencies(
              source,
              targetVersionId,
              serverContext,
              newVisited
            );

            result.transitive.push(...transitive.direct);
            result.transitive.push(...transitive.transitive);
            result.warnings.push(...transitive.warnings);
            result.conflicts.push(...transitive.conflicts);
          }
        } else if (dep.dependency_type === 'optional') {
          result.warnings.push(
            `Optional dependency available: ${dep.project_id} (${targetVersionId})`
          );
        } else if (dep.dependency_type === 'incompatible') {
          result.conflicts.push({
            projectId: dep.project_id,
            type: 'incompatible',
            reason: `This mod is incompatible with ${dep.project_id}`
          });
        }
      }
    } catch (error) {
      logger.error(`Error resolving dependencies for version ${versionId}:`, error);
      result.warnings.push(`Error resolving dependencies: ${error.message}`);
    }

    return result;
  }

  /**
   * Check compatibility with server configuration
   */
  async checkCompatibility(source, modId, versionData, serverContext) {
    const result = {
      compatible: true,
      warnings: [],
      resourceConcerns: []
    };

    try {
      // Check Minecraft version compatibility
      const mcVersionCheck = this.checkMinecraftVersionCompatibility(
        versionData.gameVersions || [],
        serverContext.serverVersion
      );
      if (!mcVersionCheck.compatible) {
        result.compatible = false;
        result.warnings.push(mcVersionCheck.warning);
      }

      // Check mod loader compatibility
      const loaderCheck = this.checkModLoaderCompatibility(
        versionData.loaders || [],
        serverContext.serverType
      );
      if (!loaderCheck.compatible) {
        result.compatible = false;
        result.warnings.push(loaderCheck.warning);
      }

      // Check resource requirements
      const resourceCheck = await this.checkResourceRequirements(
        modId,
        versionData,
        serverContext
      );
      if (resourceCheck.concerns.length > 0) {
        result.resourceConcerns.push(...resourceCheck.concerns);
      }
    } catch (error) {
      logger.error(`Error checking compatibility for mod ${modId}:`, error);
      result.warnings.push(`Error checking compatibility: ${error.message}`);
    }

    return result;
  }

  /**
   * Check if there are conflicts with currently installed mods
   */
  async detectConflicts(serverId, versionData, dependencyTree) {
    const conflicts = [];

    try {
      // Get all installed mods with their dependencies
      const installed = db
        .prepare(
          'SELECT * FROM installed_mods WHERE server_id = ? AND enabled = 1'
        )
        .all(serverId);

      const installedProjects = new Set(
        installed.map((m) => m.source_project_id).filter(Boolean)
      );

      // Check if mod conflicts with any installed mods
      const allDependencies = [...(dependencyTree.direct || []), ...(dependencyTree.transitive || [])];

      for (const dep of allDependencies) {
        // Get incompatible dependencies for this mod
        const incompatible = (versionData.dependencies || []).filter(
          (d) => d.dependency_type === 'incompatible'
        );

        for (const incompat of incompatible) {
          if (installedProjects.has(incompat.project_id)) {
            conflicts.push({
              projectId: incompat.project_id,
              reason: `Installed mod conflicts with ${incompat.project_id}`
            });
          }
        }
      }
    } catch (error) {
      logger.error(`Error detecting conflicts:`, error);
    }

    return conflicts;
  }

  /**
   * Find installed mod that satisfies a dependency
   */
  async findInstalledDependency(serverId, projectId, versionId) {
    try {
      // First try exact version match
      if (versionId) {
        const exact = db
          .prepare(
            'SELECT * FROM installed_mods WHERE server_id = ? AND source_project_id = ? AND source_version_id = ?'
          )
          .get(serverId, projectId, versionId);
        if (exact) return exact;
      }

      // Fall back to any version of the project
      return db
        .prepare(
          'SELECT * FROM installed_mods WHERE server_id = ? AND source_project_id = ? AND enabled = 1'
        )
        .get(serverId, projectId);
    } catch (error) {
      logger.error(`Error finding installed dependency:`, error);
      return null;
    }
  }

  /**
   * Find compatible version for a dependency
   */
  async findCompatibleVersion(source, projectId, serverContext) {
    try {
      const versions = await modSearchService.searchMods(
        projectId,
        {
          gameVersions: [serverContext.serverVersion],
          modLoaders: [this.getServerLoader(serverContext.serverType)],
          limit: 1
        },
        source
      );

      if (versions && versions.length > 0) {
        return versions[0].id;
      }
      return null;
    } catch (error) {
      logger.error(`Error finding compatible version for ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Get dependencies for an installed mod
   */
  async getInstalledModDependencies(serverId, filename) {
    try {
      const mod = db
        .prepare(
          'SELECT * FROM installed_mods WHERE server_id = ? AND filename = ?'
        )
        .get(serverId, filename);

      if (!mod) {
        return null;
      }

      const dependencies = db
        .prepare(
          'SELECT * FROM mod_dependencies WHERE installed_mod_id = ? ORDER BY dependency_type'
        )
        .all(mod.id);

      return {
        mod,
        dependencies
      };
    } catch (error) {
      logger.error(`Error getting dependencies for ${filename}:`, error);
      return null;
    }
  }

  /**
   * Check Minecraft version compatibility
   */
  checkMinecraftVersionCompatibility(modGameVersions, serverVersion) {
    if (!modGameVersions || modGameVersions.length === 0) {
      return { compatible: true };
    }

    if (modGameVersions.includes(serverVersion)) {
      return { compatible: true };
    }

    return {
      compatible: false,
      warning: `Mod supports ${modGameVersions.join(', ')} but server is ${serverVersion}`
    };
  }

  /**
   * Check mod loader compatibility
   */
  checkModLoaderCompatibility(modLoaders, serverType) {
    const serverLoader = this.getServerLoader(serverType);

    if (!modLoaders || modLoaders.length === 0) {
      return { compatible: true };
    }

    if (modLoaders.includes(serverLoader)) {
      return { compatible: true };
    }

    return {
      compatible: false,
      warning: `Mod requires ${modLoaders.join(' or ')} but server uses ${serverLoader}`
    };
  }

  /**
   * Check resource requirements for mod and dependencies
   */
  async checkResourceRequirements(modId, versionData, serverContext) {
    const concerns = [];
    const heavyMods = {
      'create': { minRamMb: 3000, label: 'Create mod' },
      'mekanism': { minRamMb: 2500, label: 'Mekanism' },
      'ae2': { minRamMb: 2000, label: 'Applied Energistics 2' },
      'thermal': { minRamMb: 2000, label: 'Thermal Expansion' },
      'immersive-engineering': { minRamMb: 1500, label: 'Immersive Engineering' }
    };

    // Check if this mod is known to be heavy
    const modKey = modId.toLowerCase().replace(/\s+/g, '-');
    if (heavyMods[modKey]) {
      const requirement = heavyMods[modKey];
      const allocatedMb = this.parseMemoryToMb(serverContext.serverMemory);
      if (allocatedMb < requirement.minRamMb) {
        concerns.push(
          `${requirement.label} requires at least ${requirement.minRamMb}MB RAM, but server has ${allocatedMb}MB allocated`
        );
      }
    }

    return { concerns };
  }

  /**
   * Get server loader type from server type
   */
  getServerLoader(serverType) {
    const loaderMap = {
      'forge': 'forge',
      'fabric': 'fabric',
      'neoforge': 'neoforge',
      'quilt': 'quilt'
    };
    return loaderMap[serverType.toLowerCase()] || null;
  }

  /**
   * Parse memory string (e.g., "4G") to MB
   */
  parseMemoryToMb(memoryStr) {
    if (!memoryStr) return 0;
    const match = memoryStr.match(/^(\d+)([KMG])$/i);
    if (!match) return 0;

    const value = parseInt(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'K':
        return Math.floor(value / 1024);
      case 'M':
        return value;
      case 'G':
        return value * 1024;
      default:
        return 0;
    }
  }

  /**
   * Track installed mod in database
   */
  async trackInstalledMod(serverId, modData, dependencyData) {
    try {
      const modId = uuidv4();
      const now = Math.floor(Date.now() / 1000);

      // Insert mod record
      db.prepare(
        `INSERT INTO installed_mods (
          id, server_id, filename, source, source_project_id, source_version_id,
          mod_id, name, version, enabled, file_hash, size, installed_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        modId,
        serverId,
        modData.filename,
        modData.source || null,
        modData.sourceProjectId || null,
        modData.sourceVersionId || null,
        modData.modId || null,
        modData.name,
        modData.version,
        1,
        modData.fileHash || null,
        modData.size || null,
        now,
        now
      );

      // Insert dependency records
      if (dependencyData && dependencyData.length > 0) {
        const insertDep = db.prepare(
          `INSERT INTO mod_dependencies (
            id, installed_mod_id, dependency_type, dependency_project_id,
            dependency_version_id, dependency_mod_id, resolved_installed_mod_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`
        );

        for (const dep of dependencyData) {
          insertDep.run(
            uuidv4(),
            modId,
            dep.type || 'required',
            dep.projectId || null,
            dep.versionId || null,
            dep.modId || null,
            dep.resolvedInstalledModId || null
          );
        }
      }

      return modId;
    } catch (error) {
      logger.error(`Error tracking installed mod:`, error);
      throw error;
    }
  }

  /**
   * Sync installed mods from filesystem to database
   */
  async syncInstalledMods(serverId, modsDirectory) {
    try {
      const fs = (await import('fs')).default;
      const path = (await import('path')).default;
      const crypto = (await import('crypto')).default;

      if (!fs.existsSync(modsDirectory)) {
        return { synced: 0, skipped: 0 };
      }

      const files = fs.readdirSync(modsDirectory).filter((f) => f.endsWith('.jar'));
      let synced = 0;
      let skipped = 0;

      for (const filename of files) {
        const filePath = path.join(modsDirectory, filename);

        // Check if already in database
        const existing = db
          .prepare(
            'SELECT * FROM installed_mods WHERE server_id = ? AND filename = ?'
          )
          .get(serverId, filename);

        if (existing) {
          skipped++;
          continue;
        }

        // Compute file hash
        const fileBuffer = fs.readFileSync(filePath);
        const fileHash = crypto.createHash('sha1').update(fileBuffer).digest('hex');
        const stats = fs.statSync(filePath);

        // Track untracked mod (no source info since it was manually uploaded)
        await this.trackInstalledMod(serverId, {
          filename,
          name: filename.replace('.jar', ''),
          fileHash,
          size: stats.size
        }, []);

        synced++;
      }

      return { synced, skipped };
    } catch (error) {
      logger.error(`Error syncing installed mods:`, error);
      return { synced: 0, skipped: 0, error: error.message };
    }
  }
}

export default new ModDependencyService();
