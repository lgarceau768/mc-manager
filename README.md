<p align="center">
  <img src="docs/logo.png" alt="Minecraft Server Manager" width="120" />
</p>

<h1 align="center">Minecraft Server Manager</h1>

<p align="center">
  <strong>A self-hosted web application for managing Minecraft servers with Docker</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#installation">Installation</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="Node.js" />
  <img src="https://img.shields.io/badge/docker-%3E%3D20.10-blue.svg" alt="Docker" />
</p>

---

## Overview

Minecraft Server Manager is an open-source, self-hosted solution for running and managing multiple Minecraft servers from a single web interface. Built with Docker containerization, it provides isolation, easy resource management, and persistent data storage for each server instance.

Whether you're running a small server for friends or managing multiple modded servers, this tool simplifies the entire lifecycle—from creation to backups to mod management.

<p align="center">
  <img src="docs/screenshot.png" alt="Dashboard Screenshot" width="800" />
</p>

## Features

### Server Management
- **Multi-Server Support** — Run multiple Minecraft servers simultaneously, each in isolated Docker containers
- **Server Types** — Support for Paper, Forge, Fabric, and NeoForge servers
- **One-Click Operations** — Start, stop, restart, and delete servers with a single click
- **Resource Control** — Configure memory (1-16GB) and CPU limits per server
- **Auto Port Assignment** — Automatic port allocation from a configurable range

### Real-Time Monitoring
- **Live Console** — Stream server logs in real-time via WebSocket
- **Command Execution** — Send commands directly to servers from the web UI
- **Resource Stats** — Monitor CPU and memory usage per server
- **Player Tracking** — View online players with avatar display and admin actions (kick, ban, op)

### Mod & Plugin Management
- **Mod Browser** — Search and install mods from CurseForge and Modrinth
- **Mod Library** — Upload and manage mods/plugins per server
- **Enable/Disable Mods** — Toggle mods without deleting them
- **Modpack Support** — Import modpacks from CurseForge, Modrinth, or upload your own

### Backup System
- **Manual Backups** — Create backups on-demand with one click
- **Scheduled Backups** — Configure automatic backups (hourly, daily, weekly)
- **Backup Management** — Download, restore, or delete backups from the UI
- **Safe Operations** — Uses RCON to safely pause world saving during backups

### Configuration
- **Server Settings** — Edit MOTD, max players, difficulty, PvP, and more
- **Server Icons** — Upload custom 64x64 server icons
- **File Browser** — Navigate and manage server files directly

### Notifications
- **Discord Integration** — Receive notifications for server events via Discord webhooks
- **Configurable Events** — Choose which events trigger notifications (start, stop, errors, backups)

### Security
- **Optional Authentication** — Enable login protection with username/password
- **Container Isolation** — Each server runs in its own Docker container
- **Input Validation** — All inputs are validated and sanitized

## Quick Start

### Using Docker (Recommended)

The fastest way to get started is with Docker Compose:

```bash
# Clone the repository
git clone https://github.com/yourusername/mc-server-manager.git
cd mc-server-manager

# Copy the example compose file
cp docker-compose.example.yml docker-compose.yml

# Create data directories
mkdir -p data/database data/servers data/modpacks data/backups logs

# Start the application
docker compose up -d
```

Open http://localhost:3000 in your browser.

### Using Pre-built Images

```bash
# Download the example compose file
curl -O https://raw.githubusercontent.com/yourusername/mc-server-manager/main/docker-compose.example.yml
mv docker-compose.example.yml docker-compose.yml

# Create data directories
mkdir -p data/database data/servers data/modpacks data/backups logs

# Start the application
docker compose up -d
```

## Installation

### Prerequisites

- **Docker** v20.10 or higher
- **Docker Compose** v2.0 or higher
- **Node.js** v18+ (for development only)

### Docker Deployment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/mc-server-manager.git
   cd mc-server-manager
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env to set PUBLIC_SERVER_HOST to your server's IP or hostname
   ```

3. **Start the services:**
   ```bash
   docker compose up -d
   ```

4. **Access the application:**
   - Web UI: http://localhost:3000
   - API: http://localhost:3001/api

### Development Setup

For local development without Docker:

```bash
# Install dependencies
npm run install:all

# Start development servers (backend + frontend)
npm run dev
```

The frontend runs on port 3000 and the backend on port 3001.

### Building from Source

```bash
# Build Docker images locally
./scripts/build.sh

# Or build and push to registry
./scripts/push.sh
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Public hostname or IP for Minecraft client connections
PUBLIC_SERVER_HOST=192.168.1.100

# Optional: Enable authentication
ENABLE_AUTH=false
AUTH_USERNAME=admin
AUTH_PASSWORD=changeme
JWT_SECRET=your-secret-key
```

### Docker Compose Configuration

Key settings in `docker-compose.yml`:

```yaml
services:
  backend:
    environment:
      # Where Minecraft servers store data (inside container)
      - SERVERS_DATA_PATH=/app/data/servers
      # Host path for Docker volume mounts (must match your bind mount)
      - SERVERS_DATA_PATH_HOST=${PWD}/data/servers
      # Port range for Minecraft servers
      - PORT_RANGE_START=25565
      - PORT_RANGE_END=25600
```

### Port Requirements

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Frontend | Web UI (Nginx) |
| 3001 | Backend | API Server |
| 25565-25600 | Minecraft | Game servers (configurable range) |

Ensure these ports are open in your firewall for external access.

## Usage

### Creating a Server

1. Click **"Create Server"** on the dashboard
2. Configure your server:
   - **Name**: Server identifier (alphanumeric, 3-32 chars)
   - **Type**: Paper, Forge, Fabric, or NeoForge
   - **Version**: Minecraft version (e.g., "1.20.4")
   - **Memory**: RAM allocation (4GB+ recommended for modded)
   - **CPU Limit**: Optional CPU core limit
3. Click **"Create"** — the server will be created but not started

### Managing Servers

- **Start/Stop**: Use the buttons on the server card or details page
- **Console**: View logs and execute commands in the Console tab
- **Settings**: Modify server.properties values in the Settings tab
- **Mods**: Install, enable/disable, or remove mods in the Mods tab
- **Backups**: Create and manage backups in the Backups tab
- **Players**: View online players and execute admin actions

### Connecting to a Server

Players connect using:
```
your-server-ip:port
```

Example: `192.168.1.100:25565`

The connection address is displayed on the server's Overview tab.

### Discord Notifications

1. Create a Discord webhook in your server settings
2. Go to the **Notifications** tab for your Minecraft server
3. Paste the webhook URL and enable desired events
4. Click **"Test Webhook"** to verify

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Web Browser                          │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP / WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                    Nginx (Frontend)                         │
│                      Port 3000                              │
└─────────────────────────┬───────────────────────────────────┘
                          │ Proxy
┌─────────────────────────▼───────────────────────────────────┐
│                  Express.js (Backend API)                    │
│                      Port 3001                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   SQLite    │  │   Docker    │  │   WebSocket Server  │  │
│  │  Database   │  │     API     │  │   (Console/Logs)    │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼───────┐  ┌───────▼───────┐  ┌───────▼───────┐
│   MC Server   │  │   MC Server   │  │   MC Server   │
│    (Paper)    │  │   (Forge)     │  │   (Fabric)    │
│  Port 25565   │  │  Port 25566   │  │  Port 25567   │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
┌───────▼──────────────────▼──────────────────▼───────┐
│              Host Volumes (Persistent Data)          │
│         ./data/servers/<server-id>/                  │
└─────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React, Vite, Axios |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) |
| Containers | Docker, dockerode |
| Real-time | WebSocket (ws) |
| MC Images | [itzg/minecraft-server](https://github.com/itzg/docker-minecraft-server) |

## Scripts

Utility scripts are provided in the `scripts/` directory:

| Script | Description |
|--------|-------------|
| `./scripts/start.sh` | Start the application |
| `./scripts/stop.sh` | Stop all services |
| `./scripts/status.sh` | Show service status |
| `./scripts/logs.sh` | View application logs |
| `./scripts/build.sh` | Build Docker images |
| `./scripts/push.sh` | Push images to registry |
| `./scripts/clean.sh` | Remove containers, images, and data |
| `./scripts/release.sh` | Build and push a release |

## Project Structure

```
mc-server-manager/
├── backend/                 # Node.js API server
│   └── src/
│       ├── api/            # REST API routes
│       ├── models/         # SQLite models
│       ├── services/       # Business logic
│       ├── utils/          # Utilities
│       └── websocket/      # WebSocket handlers
├── frontend/               # React application
│   └── src/
│       ├── components/     # Reusable components
│       ├── pages/          # Page views
│       └── services/       # API clients
├── scripts/                # Utility scripts
├── data/                   # Application data (gitignored)
│   ├── database/          # SQLite database
│   ├── servers/           # Server volumes
│   ├── modpacks/          # Modpack library
│   └── backups/           # Server backups
└── docs/                   # Documentation
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Commit your changes: `git commit -m 'Add my feature'`
6. Push to the branch: `git push origin feature/my-feature`
7. Open a pull request

### Running Tests

```bash
cd backend
npm run test
```

### Code Style

- Use ESLint configuration provided
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## Troubleshooting

### Docker Permission Denied

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER
# Log out and back in
```

### Minecraft Server Won't Start

1. Check the Console tab for error logs
2. Verify sufficient memory is allocated
3. Check if the port is already in use: `lsof -i :25565`
4. Ensure Docker is running: `docker ps`

### WebSocket Connection Failed

1. Ensure the backend is running on port 3001
2. Check browser console for errors
3. Verify no firewall is blocking WebSocket connections

### Database Locked

```bash
# Stop all services
./scripts/stop.sh

# Remove lock files
rm data/database/*.db-shm data/database/*.db-wal

# Restart
./scripts/start.sh
```

## Security

- **Isolation**: Each Minecraft server runs in its own Docker container
- **Non-root**: Containers run as non-root users
- **Validation**: All user inputs are validated and sanitized
- **File Access**: Operations are restricted to server-specific directories
- **Authentication**: Optional login protection available

### Reporting Security Issues

Please report security vulnerabilities via GitHub Security Advisories rather than public issues.

## Roadmap

- [ ] Scheduled server restarts
- [ ] Multi-user support with roles
- [ ] Server templates
- [ ] Prometheus metrics export
- [ ] Kubernetes deployment support
- [ ] Mobile-responsive UI improvements

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [itzg/docker-minecraft-server](https://github.com/itzg/docker-minecraft-server) — The excellent Docker image that powers our Minecraft containers
- [CurseForge](https://www.curseforge.com/) & [Modrinth](https://modrinth.com/) — Mod distribution platforms
- All contributors and users of this project

---

<p align="center">
  Made with ❤️ for the Minecraft community
</p>
