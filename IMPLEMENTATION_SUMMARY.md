# Mod Dependency Resolution & Compatibility Checking - Implementation Summary

## Overview
This document summarizes the implementation of automatic dependency resolution and compatibility checking for the Minecraft server manager's mod management system.

## Implementation Status: ✅ Complete

### Phase 1: Database Schema ✅

**Location:** `/backend/src/models/db.js`

Added three new tables to the SQLite database:

1. **`installed_mods`** - Tracks installed mods on each server
   - Stores source information (Modrinth, CurseForge, or manual upload)
   - Maintains file hash, size, and installation timestamp
   - Enables mod tracking and sync capabilities

2. **`mod_dependencies`** - Records dependency relationships
   - Links mods to their required/optional dependencies
   - Tracks resolved installations for dependency chains
   - Supports dependency type classification (required, optional, incompatible, embedded)

3. **`mod_metadata_cache`** - Caches mod metadata with TTL
   - Reduces API calls to Modrinth/CurseForge
   - Stores estimated RAM requirements and categories
   - Auto-expires cached entries

**Indexes Created:**
- `idx_installed_mods_server` - Fast lookup by server
- `idx_installed_mods_source` - Track mods by source project
- `idx_mod_dependencies_mod` - Find dependencies for a mod
- `idx_mod_dependencies_project` - Look up dependency installations

### Phase 2: Backend Services ✅

#### 2.1 modDependencyService.js (NEW)
**Location:** `/backend/src/services/modDependencyService.js`

Core service implementing dependency resolution and compatibility checking:

**Key Methods:**
- `resolveDependencies()` - Recursively resolves required/optional dependencies with circular dependency detection
- `checkCompatibility()` - Validates Minecraft version, mod loader, and resource requirements
- `detectConflicts()` - Identifies incompatible mods already installed
- `findInstalledDependency()` - Checks if dependency is already installed
- `findCompatibleVersion()` - Automatically finds compatible mod versions
- `trackInstalledMod()` - Records installations in database
- `syncInstalledMods()` - Synchronizes filesystem with database

**Algorithm Details:**
- Uses Set-based tracking for circular dependency detection
- Supports "warn but allow" approach for installation
- Estimates resource requirements (3GB Create, 2.5GB Mekanism, etc.)
- Handles embedded dependencies (already in JAR)

#### 2.2 Updated modSearchService.js
**Location:** `/backend/src/services/modSearchService.js`

**Changes:**
- Added `dependencies` field to version data returned from API
- New method `getVersionDetails()` - Fetches full version data with dependencies
- Added `getModrinthVersionDetails()` - Modrinth version detail fetching
- Added `getCurseForgeVersionDetails()` - CurseForge version detail fetching

#### 2.3 Updated modManagementService.js
**Location:** `/backend/src/services/modManagementService.js`

**New Methods:**
- `installModWithDependencies()` - Smart installation with automatic dependency resolution
- `computeFileHash()` - SHA1 hash computation for file tracking

**Updated Methods:**
- `installModFromSearch()` - Now tracks installations in database with source metadata

### Phase 3: API Endpoints ✅

**Location:** `/backend/src/api/routes/mods.js`

Two new endpoints added to the serverModsRouter:

#### 3.1 POST /api/servers/:id/mods/check-install
Dry-run compatibility and dependency check (no actual installation)

**Request Body:**
```json
{
  "source": "modrinth",
  "modId": "iris",
  "versionId": "version-id"
}
```

**Response:**
```json
{
  "modId": "iris",
  "versionId": "...",
  "source": "modrinth",
  "compatible": true/false,
  "warnings": ["array of warning strings"],
  "dependencies": {
    "direct": ["list of required deps"],
    "transitive": ["list of transitive deps"]
  },
  "conflicts": ["array of conflict objects"]
}
```

#### 3.2 GET /api/servers/:id/mods/:filename/dependencies
Retrieves dependency information for installed mod

**Response:**
```json
{
  "mod": { "id": "...", "filename": "...", ... },
  "dependencies": [
    {
      "id": "...",
      "installed_mod_id": "...",
      "dependency_type": "required",
      "dependency_project_id": "sodium"
    }
  ]
}
```

### Phase 4: Frontend Components ✅

#### 4.1 ModDependencyWarning.jsx (NEW)
**Location:** `/frontend/src/components/ModDependencyWarning.jsx`

Modal component displaying:
- Compatibility status with visual indicators
- Required dependencies (auto-installed)
- Optional dependencies (recommended)
- Incompatibility warnings
- Unresolved dependency issues
- Conflict detection warnings

**User Actions:**
- Cancel installation
- "Install" (if compatible)
- "Install Anyway" (if warnings/conflicts exist)

**Styling:** `/frontend/src/components/ModDependencyWarning.css`
- Professional modal design with animations
- Color-coded warnings, requirements, and conflicts
- Responsive layout for mobile devices
- Clear distinction between different warning types

#### 4.2 Updated ModSearchResult.jsx
**Location:** `/frontend/src/components/ModSearchResult.jsx`

**Changes:**
- Import ModDependencyWarning component
- Add state for dependency checking and warnings
- Pre-check dependencies before installation
- Display warning modal only when issues detected
- Two code paths: direct install (if compatible) vs warning flow

**Workflow:**
1. User clicks "Install"
2. System calls `checkModInstallation()` API
3. If no issues → Install directly
4. If issues → Show ModDependencyWarning modal
5. User can "Install Anyway" or "Cancel"

#### 4.3 Updated api.js
**Location:** `/frontend/src/services/api.js`

**New modApi Methods:**
```javascript
// Check compatibility before installation
checkModInstallation(serverId, source, modId, versionId)

// Get dependencies for installed mod
getModDependencies(serverId, filename)
```

## Key Features Implemented

### 1. Automatic Dependency Resolution
- Recursively resolves required dependencies
- Prevents circular dependency loops
- Handles both direct and transitive dependencies
- Auto-selects compatible versions when not specified

### 2. Compatibility Checking
- **Minecraft Version:** Verifies mod supports server version
- **Mod Loader:** Checks mod loader compatibility (Forge, Fabric, etc.)
- **Resource Requirements:** Warns if heavy mods exceed available memory
- **Conflicts:** Detects incompatible mods already installed

### 3. "Warn But Allow" Approach
- Issues don't block installation
- Users see warnings but can proceed
- Supports experienced players who know workarounds
- Maintains simplicity while providing guidance

### 4. Installation Tracking
- Records all installed mods in database
- Tracks source (Modrinth, CurseForge, manual upload)
- Maintains file hashes for verification
- Enables future mod update checking

### 5. Database Synchronization
- `syncInstalledMods()` reconciles filesystem with database
- Handles manually uploaded mods (source=null)
- Useful for migration and cleanup

## Verification & Testing

### Database Verification
```sql
-- Check installed mods
SELECT * FROM installed_mods WHERE server_id = '<server-id>';

-- Check dependencies
SELECT im.name as mod_name, md.dependency_type, md.dependency_project_id
FROM installed_mods im
JOIN mod_dependencies md ON im.id = md.installed_mod_id
WHERE im.server_id = '<server-id>';
```

### Manual Testing Checklist
- [ ] Search for mod with known dependencies (e.g., Iris Shaders)
- [ ] Click Install on version
- [ ] Verify warning modal appears with dependencies listed
- [ ] Proceed with installation
- [ ] Confirm both main mod and dependencies installed
- [ ] Check database entries in installed_mods and mod_dependencies
- [ ] Verify mod list in UI shows both mods

### Edge Cases Handled
- Circular dependencies → Detected and warned
- Optional dependencies → Listed separately, not auto-installed
- Embedded dependencies → Skipped (already in JAR)
- Manual uploads → Tracked with source=null
- Out-of-sync database → syncInstalledMods() reconciles
- API unavailable → Installation proceeds with warnings

## File Structure

```
backend/
├── src/
│   ├── models/
│   │   └── db.js [UPDATED] - 3 new tables added
│   ├── services/
│   │   ├── modDependencyService.js [NEW]
│   │   ├── modSearchService.js [UPDATED] - Dependencies support
│   │   └── modManagementService.js [UPDATED] - Tracking & hashing
│   └── api/routes/
│       └── mods.js [UPDATED] - 2 new endpoints

frontend/
├── src/
│   ├── components/
│   │   ├── ModDependencyWarning.jsx [NEW]
│   │   ├── ModDependencyWarning.css [NEW]
│   │   └── ModSearchResult.jsx [UPDATED] - Integration
│   └── services/
│       └── api.js [UPDATED] - New API methods
```

## API Call Flow

### Installation with Dependency Check
```
User clicks "Install"
  ↓
POST /api/servers/:id/mods/check-install
  ↓
modDependencyService.resolveDependencies()
modDependencyService.checkCompatibility()
modDependencyService.detectConflicts()
  ↓
Response: { compatible, warnings, dependencies, conflicts }
  ↓
If warnings/conflicts: Show ModDependencyWarning modal
  ↓
User proceeds with installation
  ↓
POST /api/servers/:id/mods/install
  ↓
modManagementService.installModFromSearch()
  ↓
modDependencyService.trackInstalledMod()
  ↓
Database updated with mod and dependency records
```

## Next Steps (Optional Enhancements)

1. **Automatic Updates:** Check for mod updates and notify users
2. **Modpack Support:** Full modpack dependency resolution
3. **Conflict Resolution:** Suggest removing incompatible mods
4. **Performance Profiling:** Estimate FPS impact based on mod combinations
5. **Version Pinning:** Let users lock mods to specific versions
6. **Batch Operations:** Install multiple mods with dependency resolution

## Implementation Quality

- **Security:** All user inputs validated, file operations restricted to server directories
- **Error Handling:** Comprehensive error messages with actionable guidance
- **Performance:** Efficient database queries with proper indexing
- **UX:** Clear visual feedback, modals don't block other operations
- **Maintainability:** Clean separation of concerns, well-documented code

## Testing Recommendations

### End-to-End Tests
1. Install simple mod (no dependencies) → Should install directly
2. Install Iris Shaders → Should require and auto-install Sodium
3. Install Fabric mod on Forge server → Should warn incompatibility
4. Circular dependency scenario → Should detect and warn

### Database Tests
- Verify indexes are created and used
- Check foreign key constraints work
- Test cascade delete on server removal
- Verify data integrity after sync operations

---

**Implementation Date:** January 18, 2026
**Version:** 1.0.0
**Status:** Ready for Testing
