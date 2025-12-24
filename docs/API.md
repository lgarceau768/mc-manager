# API Documentation

Base URL: `http://localhost:3001/api`

## Health Check

### GET /health

Check API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

## Server Endpoints

### POST /servers

Create a new Minecraft server.

**Request Body:**
```json
{
  "name": "my-server",
  "version": "1.20.4",
  "memory": "4G",
  "cpuLimit": 2.0
}
```

**Validation:**
- `name`: Alphanumeric + hyphens, 3-32 characters
- `version`: Required string (e.g., "1.20.4", "latest")
- `memory`: Format "XG" or "XM", range 512M-16G
- `cpuLimit`: Optional number, 0.5-8.0

**Response (201):**
```json
{
  "id": "uuid-here",
  "name": "my-server",
  "type": "PAPER",
  "version": "1.20.4",
  "port": 25565,
  "status": "stopped",
  "memory": "4G",
  "cpu_limit": "2.0",
  "container_id": "docker-container-id",
  "volume_path": "/path/to/data",
  "created_at": 1234567890,
  "updated_at": 1234567890
}
```

**Errors:**
- `400`: Validation error
- `409`: Server name or port conflict

---

### GET /servers

List all servers.

**Response (200):**
```json
[
  {
    "id": "uuid-here",
    "name": "my-server",
    "type": "PAPER",
    "version": "1.20.4",
    "port": 25565,
    "status": "running",
    "memory": "4G",
    "cpu_limit": "2.0",
    "container_id": "docker-container-id",
    "volume_path": "/path/to/data",
    "created_at": 1234567890,
    "updated_at": 1234567890,
    "stats": {
      "cpuUsage": "25.50",
      "memoryUsage": "2.50 GB",
      "memoryLimit": "6.00 GB",
      "memoryPercent": "41.67"
    }
  }
]
```

---

### GET /servers/:id

Get server details by ID.

**Response (200):**
```json
{
  "id": "uuid-here",
  "name": "my-server",
  "type": "PAPER",
  "version": "1.20.4",
  "port": 25565,
  "status": "running",
  "memory": "4G",
  "cpu_limit": "2.0",
  "container_id": "docker-container-id",
  "volume_path": "/path/to/data",
  "created_at": 1234567890,
  "updated_at": 1234567890,
  "stats": {
    "cpuUsage": "25.50",
    "memoryUsage": "2.50 GB",
    "memoryLimit": "6.00 GB",
    "memoryPercent": "41.67"
  }
}
```

**Errors:**
- `404`: Server not found

---

### POST /servers/:id/start

Start a server.

**Response (200):**
```json
{
  "id": "uuid-here",
  "status": "starting",
  ...
}
```

**Errors:**
- `404`: Server not found
- `409`: Server already running

---

### POST /servers/:id/stop

Stop a server gracefully (executes save-all).

**Response (200):**
```json
{
  "id": "uuid-here",
  "status": "stopped",
  ...
}
```

**Errors:**
- `404`: Server not found
- `409`: Server already stopped

---

### POST /servers/:id/restart

Restart a server (stop then start).

**Response (200):**
```json
{
  "id": "uuid-here",
  "status": "running",
  ...
}
```

**Errors:**
- `404`: Server not found

---

### DELETE /servers/:id

Delete a server and remove its container. Volume data is preserved.

**Response (204):**

No content.

**Errors:**
- `404`: Server not found

---

### GET /servers/:id/logs

Get server console logs.

**Query Parameters:**
- `tail`: Number of lines to retrieve (default: 100)

**Response (200):**
```json
{
  "logs": "[12:00:00] [Server thread/INFO]: Starting minecraft server...\n[12:00:01] [Server thread/INFO]: Done!"
}
```

**Errors:**
- `404`: Server not found

---

## WebSocket Console

### ws://localhost:3001/ws/console?serverId=<id>

Real-time server console streaming.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:3001/ws/console?serverId=<server-id>');
```

**Messages from Server:**

Connection success:
```json
{
  "type": "connected",
  "serverId": "uuid-here",
  "serverName": "my-server",
  "status": "running"
}
```

Log message:
```json
{
  "type": "log",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "message": "[12:00:00] [Server thread/INFO]: Starting server..."
}
```

Status update:
```json
{
  "type": "status",
  "message": "Server is stopped. Start the server to view logs."
}
```

Error:
```json
{
  "type": "error",
  "message": "Error description"
}
```

Connection status change:
```json
{
  "type": "connection",
  "status": "connected|disconnected"
}
```

**Messages to Server:**

Ping:
```json
{
  "type": "ping"
}
```

Execute command (not yet implemented):
```json
{
  "type": "command",
  "command": "list"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ErrorType",
    "stack": "Stack trace (development only)"
  }
}
```

**Common Error Codes:**
- `ValidationError` (400): Invalid request data
- `NotFoundError` (404): Resource not found
- `ConflictError` (409): Resource conflict
- `DockerError` (500): Docker operation failed
- `ServerError` (500): Internal server error

---

## Rate Limiting

Currently no rate limiting is implemented. This will be added in a future phase.

## Authentication

Currently no authentication is required. User authentication will be added in Phase 3.
