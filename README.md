# Minecraft Server Manager

A self-hosted web application for managing modded Minecraft servers using Docker containerization.

## Features

- 🎮 **Multi-Server Management**: Create and manage multiple Minecraft server instances
- 🐳 **Docker-Based**: Each server runs in an isolated Docker container
- 🖥️ **Web Interface**: User-friendly React-based dashboard
- 📊 **Real-Time Monitoring**: Live server stats (CPU, memory usage)
- 📝 **Console Access**: Real-time log streaming and command execution via WebSocket
- ⚙️ **Resource Control**: Configure CPU and memory limits per server
- 🎯 **Server Types**: Currently supports Paper servers (Forge and Fabric coming in Phase 2)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (version 20.10 or higher)
  - Docker Engine must be running
  - User must be in the `docker` group: `sudo usermod -aG docker $USER`

- **Node.js** (version 18 or higher)

- **npm** (version 9 or higher, comes with Node.js)

## Installation

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd /Users/lgarceau/Code/personal/mc-server-manager
   ```

2. **Install dependencies**:
   ```bash
   npm run install:all
   ```

3. **Pull the Minecraft server Docker image**:
   ```bash
   docker pull itzg/minecraft-server:latest
   ```

4. **Create necessary directories**:
   ```bash
   mkdir -p data/database data/servers
   ```

5. **Configure environment** (backend/.env is already created):
   - Review `backend/.env` and adjust if needed
   - Default settings should work for most setups

## Running the Application

### Option 1: Docker Deployment (Recommended for Production)

The easiest way to run the application is using Docker Compose:

1. **Ensure Docker is running**:
   ```bash
   docker ps
   ```

2. **Pull the Minecraft server image**:
   ```bash
   docker pull itzg/minecraft-server:latest
   ```

3. **Start the application**:
   ```bash
   docker-compose up -d
   ```

4. **View logs** (optional):
   ```bash
   docker-compose logs -f
   ```

5. **Stop the application**:
   ```bash
   docker-compose down
   ```

**Access the application:**
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001/api (not directly accessible, proxied through frontend)

**Rebuild after code changes:**
```bash
docker-compose up -d --build
```

### Option 1b: Build a Single Docker Image

For publishing a self-contained image (UI + API) you can use the build tooling under `build/`:

1. Copy the environment template and adjust values for your host:
   ```bash
   cp build/.env.example build/.env
   # edit build/.env (at minimum set SERVERS_DATA_PATH_HOST to your real host path)
   ```

2. Build the image (this runs the frontend build, installs backend dependencies, and bakes the defaults defined in `build/.env`):
   ```bash
   npm run build:image
   # or ./build/build-image.sh
   ```

3. Run the resulting container (serves both UI and API on port 3001 by default):
   ```bash
   docker run -d \
     --name mc-server-manager \
     -p 8080:3001 \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -v /opt/mc-manager/data:/data \
     -e SERVERS_DATA_PATH_HOST=/opt/mc-manager/data/servers \
     mc-server-manager:latest
   ```

The `/data` bind mount stores the SQLite database, Minecraft server data, and shared modpack library. `SERVERS_DATA_PATH_HOST` must be the real host path that Docker should mount into the Minecraft containers so they see the same world data directory.

### Option 2: Development Mode (Local)

Run both backend and frontend locally without Docker:

1. **Install dependencies** (if not already done):
   ```bash
   npm run install:all
   ```

2. **Run both services**:
   ```bash
   npm run dev
   ```

   Or run them separately:
   ```bash
   # Terminal 1 - Backend API
   npm run dev:backend

   # Terminal 2 - Frontend UI
   npm run dev:frontend
   ```

**Access the application:**
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **API Health Check**: http://localhost:3001/api/health

## Usage

### Creating a Server

1. Click "Create Server" button on the dashboard
2. Fill in the form:
   - **Server Name**: Alphanumeric with hyphens (3-32 chars)
   - **Minecraft Version**: Paper version (e.g., "1.20.4" or "latest")
   - **Memory Allocation**: 1GB to 16GB (4GB recommended)
   - **CPU Limit**: 0.5 to 8.0 cores (optional)
3. Click "Create Server"

The server will be created but not started automatically.

### Managing Servers

- **Start**: Click "Start" on a stopped server
- **Stop**: Click "Stop" on a running server (gracefully saves world)
- **Restart**: Click "Restart" to stop and start the server
- **Delete**: Click "Delete" and confirm (volume data is preserved)
- **View Details**: Click on a server card to see full details

### Monitoring

On the server details page:
- **Server Info**: View ID, type, version, port, and resources
- **Stats**: Real-time CPU and memory usage
- **Console**: Live log streaming with command execution

### Connecting to a Server

Players can connect using:
```
<your-ip>:<server-port>
```

For example, if your server port is 25565:
```
192.168.1.100:25565
```

**Note**: You may need to configure your firewall to allow the port.

## Architecture

```
┌─────────────────┐
│  React Frontend │  (Port 3000)
└────────┬────────┘
         │ HTTP/WebSocket
┌────────▼────────┐
│  Express API    │  (Port 3001)
└────────┬────────┘
         │
    ┌────┴─────┬──────────┬──────────┐
    │          │          │          │
┌───▼──┐  ┌───▼──┐  ┌───▼──┐  ┌───▼──┐
│MC #1 │  │MC #2 │  │MC #3 │  │MC #N │  (Docker containers)
│Paper │  │Paper │  │Paper │  │...   │
└───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘
    │         │         │         │
┌───▼─────────▼─────────▼─────────▼───┐
│     Host Volumes (Persistent Data)   │
└──────────────────────────────────────┘
```

## Project Structure

```
mc-server-manager/
├── backend/              # Node.js/Express API
│   └── src/
│       ├── api/         # REST endpoints
│       ├── models/      # Database models (SQLite)
│       ├── services/    # Business logic
│       ├── utils/       # Utilities
│       ├── websocket/   # WebSocket console
│       └── server.js    # Entry point
├── frontend/            # React UI
│   └── src/
│       ├── components/  # React components
│       ├── pages/       # Page views
│       └── services/    # API/WebSocket clients
├── data/                # Application data
│   ├── database/        # SQLite database
│   └── servers/         # Server volumes
└── docs/                # Documentation
```

## Configuration

### Backend Environment Variables

Edit `backend/.env`:

```env
PORT=3001                              # API server port
DATABASE_PATH=./data/database/servers.db  # SQLite database
SERVERS_DATA_PATH=./data/servers       # Server data directory
PORT_RANGE_START=25565                 # First server port
PORT_RANGE_END=25600                   # Last server port
LOG_LEVEL=info                         # Logging level
```

### Build Script Environment Variables

The image build helper (`build/build-image.sh` or `npm run build:image`) reads `build/.env`. Copy `.env.example` and customize these values before building:

- `IMAGE_NAME` / `IMAGE_TAG`: name of the resulting Docker image.
- `NODE_VERSION`: base Node.js image tag (defaults to `20-alpine`).
- `PORT`, `DATABASE_PATH`, `SERVERS_DATA_PATH`, `MODPACKS_PATH`: default in-container paths.
- `SERVERS_DATA_PATH_HOST`: **host** path used when spawning Minecraft containers. This must match the path you bind into the manager container (for example `/opt/mc-manager/data/servers`).
- `PUBLIC_SERVER_HOST`, `PORT_RANGE_START`, `PORT_RANGE_END`, `LOG_LEVEL`: runtime defaults that can still be overridden at `docker run` time with `-e`.
- `FRONTEND_DIST_PATH`: where the backend should serve the bundled React app inside the container (`/app/frontend` by default).

### Port Management

- Server ports are automatically assigned from the configured range
- Default range: 25565-25600 (36 possible servers)
- Ports are tracked in the database to prevent conflicts

## Docker Deployment Details

### Architecture

When running with Docker Compose:
- **Frontend**: Nginx serving static React build (port 3000)
- **Backend**: Node.js API server (internal, proxied through Nginx)
- **Minecraft Servers**: Created by backend, run as separate containers on host network

### Volumes

The following directories are persisted:
- `./data/database/`: SQLite database
- `./data/servers/`: Minecraft server data volumes
- `./logs/`: Application logs

### Environment Variables

Backend environment variables can be customized in `docker-compose.yml` under the `backend` service.

### Networking

- Frontend container exposes port 3000
- Backend communicates with frontend via internal network
- Minecraft servers are created on the host network to expose their ports (25565+)

### Production Considerations

For production deployment:

1. **Use a reverse proxy** (like Traefik or Nginx) with SSL:
   ```yaml
   # Add to docker-compose.yml
   labels:
     - "traefik.enable=true"
     - "traefik.http.routers.mc-manager.rule=Host(`your-domain.com`)"
     - "traefik.http.routers.mc-manager.tls=true"
   ```

2. **Set strong secrets** and environment variables

3. **Configure backups** for the `./data` directory

4. **Monitor resource usage** with Docker stats

5. **Set up log rotation** for application logs

## Troubleshooting

### Docker Permission Denied

If you get a Docker permission error:
```bash
sudo usermod -aG docker $USER
# Then log out and log back in
```

### Docker Compose: Backend Can't Access Docker Socket

Ensure the Docker socket is mounted correctly in `docker-compose.yml`:
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock
```

### Ports Already in Use

If port 3000 is already in use, change it in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Changed from 3000:80
```

### Server Won't Start

1. Check Docker is running: `docker ps`
2. Check logs: View console in the UI or `docker logs mc-<server-id>`
3. Verify port isn't in use: `sudo lsof -i :<port>`

### WebSocket Connection Failed

1. Ensure backend is running on port 3001
2. Check browser console for errors
3. Verify server is in "running" state

### Database Locked

If you get a database locked error:
```bash
# Stop all processes
pkill -f "node.*server.js"

# Remove lock files
rm data/database/*.db-shm data/database/*.db-wal

# Restart
npm run dev
```

## Security Considerations

- Servers run as non-root in Docker containers
- Input validation on all API endpoints
- Restricted port range (25565-25600)
- Isolated server volumes
- No sensitive data exposed in error messages

## Roadmap

### Phase 2 (Planned)
- Multi-server type support (Forge, Fabric)
- Configuration file editor
- Mod/plugin upload and management
- Manual backup/restore

### Phase 3 (Planned)
- Automated scheduled backups
- User authentication
- Monitoring dashboard
- Modpack integration (CurseForge/Modrinth)

### Phase 4 (Planned)
- Performance optimizations
- Security hardening
- Deployment guides
- Docker Compose production setup

## Implementation Plan for Upcoming Features

To prepare the project for public release and broader modded-server workflows, the following roadmap items have detailed plans that can be implemented incrementally.

### 1. Expanded Mod Loader Support (Forge & Fabric)
- **Backend**: Extend the server creation flow to accept Forge and Fabric parameters (loader version, installer URL, optional modpack metadata). Update `dockerService` so the container env vars (e.g., `TYPE=FORGE`, `TYPE=FABRIC`) map to the itzg image capabilities, and ensure loader-specific files (installer, mods, config) are mounted in the per-server volume structure described in `modpacks/<loader>/`.
- **Saved modpacks**: Normalize the `modpacks` directory to `modpacks/{paper,forge,fabric}/...` and update upload/list endpoints so the loader type determines the persistence path. Add validation that ensures the zip contains the expected layout (e.g., `mods/`, `config/`, optional `overrides/`).
- **UI**: Update `CreateServerForm` to surface loader choice + loader-specific fields, surface loader metadata in cards/details, and allow selecting from saved modpacks filtered by loader.

### 2. Individual Mod Management
- **Backend**: Add endpoints for listing, uploading, enabling/disabling, and deleting mods per server (e.g., `/servers/:id/mods`). This is essentially a specialized wrapper around the file explorer but lets the UI understand mod/plug-in metadata (filename, enabled flag, last updated).
- **UI**: Introduce a “Mods” tab in `ServerDetails` with drag-and-drop upload, status toggles, and delete actions. Reuse the ModUploader component but provide inline feedback (success/failure, modpack conflicts).
- **Validation**: Optionally parse fabric/forge `.jar` manifest to show mod name/version; warn when a mod duplicates another version.

### 3. Modern Minecraft-Themed UI Refresh
- **Design direction**: Adopt a clean “technical” Minecraft aesthetic (dark slate palette, blocky accent colors, subtle gradients inspired by the launcher). Create a shared theme file (CSS variables or Tailwind config) to consolidate colors, fonts, and spacing.
- **Components**: Refresh Server Cards, tabs, and dialogs with consistent spacing, iconography, and backgrounds (e.g., pixel grid textures, subtle noise overlays). Consider adding a hero header with key server stats and call-to-action buttons.
- **Responsiveness**: Ensure the refreshed layout maintains accessibility (contrast ratios) and handles tablet/mobile breakpoints gracefully.

### 4. Backup & Restore
- **Backend**: Implement `/servers/:id/backups` endpoints to trigger zip/tarball creation of the server directory (world, configs, mods) and to list and download stored archives. Backups should live under `data/backups/<serverId>/timestamp.zip`. Provide a restore endpoint that stops the server, extracts the archive, and restarts it.
- **Scheduling (optional)**: Introduce a lightweight cron/task runner to support automatic daily/weekly backups with retention settings stored per server.
- **UI**: Add a Backup panel that lists available archives, includes “Create backup” and “Restore” buttons, and exposes download links.

### 5. Login & Access Control
- **Configuration**: Add env vars (`ENABLE_LOGIN`, `LOGIN_USERNAME`, `LOGIN_PASSWORD`, `JWT_SECRET`, etc.) that drive whether auth is required. Defaults can keep the app open for self-hosted development.
- **Backend**: Introduce a minimal auth service that issues JWTs via a `/api/auth/login` route. Protect all API routes with middleware when auth is enabled. Tokens can be short-lived and stored in HttpOnly cookies.
- **Frontend**: Build a single-page login form that is shown before the dashboard when `ENABLE_LOGIN` is true (check via `/api/health`). Store session info using context and intercept axios requests to attach cookies/headers.

### 6. CurseForge Modpack Imports
- **Backend**: Create a `/modpacks/import` endpoint that accepts a CurseForge project or direct zip URL. Use the CurseForge API (or simple HTTP download when the URL is already signed) to fetch the zip, validate it, and extract into the proper loader bucket under `modpacks/`.
- **UI**: Extend the Modpack Library to include an “Import from CurseForge URL” form. Show progress and result status, then refresh the loader-specific modpack list.
- **Server creation**: Allow the create-server form to accept a CurseForge URL directly so new servers can be bootstrapped from a remote pack in a single step.

## License

MIT

## Contributing

This is currently a personal project. If you'd like to contribute, please open an issue first to discuss proposed changes.

## Support

For issues or questions, please check:
1. This README
2. The `/docs` directory for additional documentation
3. GitHub issues (if repository is public)
