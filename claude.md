# Minecraft Server Manager

A self-hosted web application for managing modded Minecraft servers with Docker containerization.

## Project Overview

This application provides a user-friendly web interface for managing multiple Minecraft server instances (Forge, Fabric, Paper, Bukkit, Spigot) on a single Linux host. It abstracts away the complexity of server setup, configuration, and maintenance through automation and Docker containerization.

### Key Features

- **Multi-Server Management**: Create and manage multiple server instances simultaneously
- **Server Type Support**: Forge, Fabric, Paper, Spigot, Bukkit with version selection
- **Automated Setup**: One-click server creation with automatic downloads and configuration
- **Resource Management**: Allocate and limit CPU/RAM per server instance
- **Mod/Plugin Management**: Upload, install, and remove mods/plugins via web UI
- **Configuration Editor**: Edit server.properties and other config files through the interface
- **Console Access**: Real-time server console output and command input
- **Backup System**: Automated scheduled backups with RCON-based save management
- **Monitoring**: Track server status, player count, resource usage, and TPS

## Architecture

### Technology Stack

**Backend:**
- Runtime: Node.js or Python (to be decided)
- API Framework: Express.js / FastAPI
- Containerization: Docker with Docker Compose
- Process Management: Docker API for container lifecycle
- RCON Protocol: For server communication and backups

**Frontend:**
- Framework: React / Vue.js (to be decided)
- Real-time Updates: WebSockets for console logs and status
- UI Components: Modern component library for forms and controls

**Storage:**
- Database: SQLite / PostgreSQL for server metadata and user accounts
- File Storage: Host volumes mounted to containers for persistent data
- Backup Storage: Configurable local/remote backup destinations

### System Architecture

```
┌─────────────────┐
│   Web UI        │ ← User interacts via browser
└────────┬────────┘
         │ HTTPS
┌────────▼────────┐
│  Backend API    │ ← Handles requests, validation, auth
└────────┬────────┘
         │
    ┌────┴─────┬──────────┬──────────┐
    │          │          │          │
┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐
│MC #1 │  │MC #2 │  │MC #3 │  │MC #N │ ← Docker containers
│Forge │  │Fabric│  │Paper │  │...   │
└───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘
    │         │         │         │
┌───▼─────────▼─────────▼─────────▼───┐
│     Host Volumes (Persistent Data)   │
└──────────────────────────────────────┘
```

### Container Strategy

- **Base Image**: Use `itzg/minecraft-server` for simplified server management
- **Isolation**: One server = one container with dedicated resources
- **Networking**: Each server gets unique host port mapping (25565, 25566, etc.)
- **Volumes**: Per-server volumes for worlds, mods/plugins, configs, and logs
- **Resource Limits**: Docker-enforced CPU and memory constraints

## Project Structure

```
mc-server-manager/
├── backend/              # API server code
│   ├── api/             # REST API endpoints
│   ├── services/        # Business logic
│   │   ├── server.js    # Server lifecycle management
│   │   ├── docker.js    # Docker API interactions
│   │   ├── backup.js    # Backup/restore logic
│   │   └── rcon.js      # RCON protocol implementation
│   ├── models/          # Database models
│   └── utils/           # Helper functions
├── frontend/            # Web UI code
│   ├── src/
│   │   ├── components/  # React/Vue components
│   │   ├── pages/       # Page views
│   │   └── services/    # API client
│   └── public/
├── docker/              # Docker-related files
│   ├── templates/       # Docker Compose templates per server type
│   └── base/            # Custom Dockerfiles if needed
├── docs/                # Documentation
│   └── research.md      # Technical research and references
└── scripts/             # Utility scripts
```

## Development Guidelines

### Security First

1. **Process Isolation**: Always run Minecraft servers as non-root users in containers
2. **Input Validation**: Sanitize all user inputs (file paths, commands, configs)
3. **Authentication**: Implement secure auth for web interface (consider 2FA)
4. **File Access**: Restrict file operations to server-specific directories only
5. **RCON Security**: Use strong passwords, localhost-only binding
6. **Least Privilege**: Backend should have minimal permissions, use Docker API safely

### Best Practices

1. **No Over-Engineering**: Build features as needed, avoid premature abstraction
2. **Docker-First**: Leverage existing images (itzg/minecraft-server) rather than reinventing
3. **Graceful Shutdown**: Always use save-all + proper stop commands, never force-kill
4. **Error Handling**: Surface errors clearly to users, log comprehensively
5. **Resource Awareness**: Warn users about memory/CPU requirements per server type
6. **Backup Paranoia**: Make backups easy and automatic, test restore functionality

### Code Standards

- **Naming**: Use clear, descriptive names (no abbreviations)
- **Comments**: Explain "why" not "what" (code should be self-documenting)
- **Error Messages**: Provide actionable error messages with context
- **Logging**: Include timestamps, server ID, and operation context
- **Configuration**: Use environment variables for deployment-specific settings

## Key Implementation Details

### Server Creation Workflow

1. User selects server type, version, name, and resources via UI
2. Backend validates inputs and checks port availability
3. System creates server directory structure on host
4. Generate Docker Compose file from template with environment variables:
   - `TYPE`: FORGE, FABRIC, PAPER, etc.
   - `VERSION`: Minecraft version
   - `EULA`: TRUE (auto-accept)
   - `MEMORY`: RAM allocation (e.g., "4G")
5. Map unique port and volume path
6. Store server metadata in database
7. Start container and stream logs to UI

### Resource Management

**Memory Allocation:**
- UI presents slider/input in GB
- Translates to `MEMORY` env var for itzg image
- Set Docker container limit slightly higher (e.g., 6G for 4G heap)
- Minimum: 1G for vanilla/Paper, 4G recommended for modded

**CPU Allocation:**
- Use Docker `cpus` limit (e.g., "2.0" for 2 cores)
- Note: Minecraft is largely single-threaded; 2-4 cores is typical
- Additional cores help with GC and mod background tasks

### Backup Strategy

**Automated Backups:**
1. Use RCON to send `save-all flush` then `save-off`
2. Create tarball of server directory (or just world folders)
3. Send RCON `save-on` to resume
4. Store backup with timestamp: `server-name-YYYY-MM-DD-HH-MM.tar.gz`
5. Apply retention policy (keep last N backups or N days)

**Integration Options:**
- Implement custom backup scheduler in backend
- OR use `itzg/docker-mc-backup` sidecar container per server
- Provide "Backup Now" button for manual backups
- Support backup download through UI

### RCON Communication

Enable RCON in server.properties:
```properties
enable-rcon=true
rcon.port=25575
rcon.password=<strong-random-password>
```

Use RCON for:
- Backup coordination (save-off/save-on)
- Player list and count
- Executing commands from UI console
- Server status checks

### Port Management

**Strategy:**
- Maintain port pool (e.g., 25565-25600)
- Track assigned ports in database
- Auto-assign next available on server creation
- Validate no conflicts before starting container
- Display port prominently in UI for user connection info

**Firewall Notes:**
- Document that users must open ports on host firewall
- Provide ufw/iptables examples in docs
- Check connectivity after server start (optional feature)

## Common Tasks

### Adding a New Server Type

1. Create Docker Compose template in `docker/templates/<type>.yml`
2. Add server type to backend enum/constants
3. Implement type-specific environment variables
4. Update UI to include new type in dropdown
5. Add any type-specific validation logic
6. Document specific requirements (Java version, memory needs)

### Implementing a New Feature

1. Check if feature already exists in itzg/minecraft-server image
2. Design database schema changes if needed
3. Create API endpoint in backend
4. Implement business logic in appropriate service
5. Add UI components and integrate with API
6. Test with multiple server types
7. Update documentation

### Debugging Server Issues

1. Check Docker container logs: `docker logs <container-name>`
2. Review server-specific logs in volume (latest.log)
3. Verify RCON connectivity if using backup features
4. Check resource limits (OOM kills show in docker inspect)
5. Validate mod/plugin compatibility and versions
6. Ensure file permissions on volumes are correct

## References

See `/docs/research.md` for comprehensive technical background on:
- Minecraft server types (Forge, Fabric, Paper differences)
- Linux server setup procedures
- Docker containerization strategies
- Performance tuning (Aikar's flags, GC settings)
- Security considerations
- Networking and port management
- Existing tools and images

## Development Phases

### Phase 1: MVP (Minimum Viable Product)
- [x] Research and architecture design
- [ ] Backend API for server CRUD operations
- [ ] Docker container lifecycle management
- [ ] Basic web UI for server list and controls
- [ ] Single server type support (start with Paper)
- [ ] Console log streaming

### Phase 2: Core Features
- [ ] Multi-server type support (Forge, Fabric)
- [ ] Configuration file editor
- [ ] Mod/plugin upload and management
- [ ] Resource allocation controls
- [ ] Manual backup/restore

### Phase 3: Advanced Features
- [ ] Automated scheduled backups
- [ ] User authentication and roles
- [ ] Server monitoring dashboard
- [ ] Modpack integration (CurseForge/Modrinth)
- [ ] Automatic updates

### Phase 4: Polish
- [ ] Performance optimizations
- [ ] Security hardening
- [ ] Comprehensive documentation
- [ ] Deployment guides
- [ ] Testing and stability improvements

## Notes for Claude

- This is a greenfield project - design decisions are open for discussion
- Prioritize simplicity and security over feature richness
- Leverage existing tools (itzg images) rather than building from scratch
- Focus on making complex tasks simple for non-technical users
- Always validate against the research.md for technical accuracy
- Consider resource constraints - this runs on single host, not cloud-scale
