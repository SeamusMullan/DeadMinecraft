# Prismarine Viewer Integration Guide

This guide explains how to use the prismarine-viewer integration in the DeadMinecraft bot server.

## Overview

The server now includes `prismarine-viewer` which allows you to view the Minecraft world from any bot's perspective through a web browser. Each viewer runs on its own port and can be configured for first-person or third-person view.

## Features

- View the world from any connected bot's perspective
- Support for both first-person and third-person views
- Configurable view distance
- Multiple viewers can run simultaneously
- Automatic port allocation (ports 3100-3200)
- RESTful API for controlling viewers

## API Endpoints

### Get All Active Viewers

```
GET /api/viewers
```

Returns a list of all active viewers and viewer statistics.

**Response:**
```json
{
  "viewers": [
    {
      "botUsername": "Bot1",
      "port": 3100,
      "firstPerson": false,
      "viewDistance": 6
    }
  ],
  "stats": {
    "activeViewers": 1,
    "usedPorts": [3100],
    "availablePorts": 99
  }
}
```

### Get Viewer Stats

```
GET /api/viewers/stats
```

Returns statistics about the viewer manager.

### Get Viewer for Specific Bot

```
GET /api/viewers/:username
```

Returns viewer information for a specific bot.

**Response:**
```json
{
  "botUsername": "Bot1",
  "port": 3100,
  "firstPerson": false,
  "viewDistance": 6
}
```

### Start Viewer for a Bot

```
POST /api/viewers/:username/start
```

Starts a viewer for the specified bot.

**Request Body:**
```json
{
  "port": 3100,           // Optional: specific port to use
  "firstPerson": false,   // Optional: first-person view (default: false)
  "viewDistance": 6       // Optional: view distance in chunks (default: 6)
}
```

**Response:**
```json
{
  "success": true,
  "viewer": {
    "botUsername": "Bot1",
    "port": 3100,
    "firstPerson": false,
    "viewDistance": 6
  },
  "url": "http://localhost:3100"
}
```

### Stop Viewer for a Bot

```
POST /api/viewers/:username/stop
```

Stops the viewer for the specified bot.

**Response:**
```json
{
  "success": true
}
```

### Stop All Viewers

```
POST /api/viewers/all/stop
```

Stops all active viewers.

**Response:**
```json
{
  "success": true
}
```

## Usage Examples

### Using cURL

**Start a viewer for a bot:**
```bash
curl -X POST http://localhost:3000/api/viewers/Bot1/start \
  -H "Content-Type: application/json" \
  -d '{"firstPerson": false, "viewDistance": 8}'
```

**Get all active viewers:**
```bash
curl http://localhost:3000/api/viewers
```

**Stop a viewer:**
```bash
curl -X POST http://localhost:3000/api/viewers/Bot1/stop
```

### Using the Web Browser

Once you start a viewer using the API, open your web browser and navigate to the URL provided in the response:

```
http://localhost:3100
```

You'll see a 3D view of the Minecraft world from your bot's perspective.

### Controls in the Viewer

- **Mouse**: Look around
- **WASD**: Move the camera (in third-person mode)
- **Space/Shift**: Move up/down
- **Scroll**: Zoom in/out

## Configuration

The viewer port range is configured in `src/server/index.ts`:

```typescript
this.viewerManager = new ViewerManager(3100, 3200) // Viewer ports from 3100-3200
```

You can modify this range if needed, ensuring it doesn't conflict with other services.

## Important Notes

1. **Bot Must Be Connected**: The bot must be connected to the Minecraft server before you can start a viewer.

2. **Port Conflicts**: Make sure the viewer ports don't conflict with your API port (3000) or WebSocket port (3001).

3. **Performance**: Each viewer consumes resources. Avoid running too many viewers simultaneously.

4. **Automatic Cleanup**: Viewers are automatically stopped when:
   - You explicitly stop them via API
   - The server shuts down
   - The bot disconnects (viewer may show errors)

5. **View Distance**: Higher view distances show more of the world but consume more resources. Default is 6 chunks.

## Troubleshooting

### Viewer shows "Cannot connect"
- Ensure the bot is connected to the Minecraft server
- Check that the bot hasn't disconnected
- Verify the viewer port is accessible

### Port already in use
- Use the `/api/viewers` endpoint to see which ports are in use
- Let the system auto-allocate a port by not specifying one
- Restart the server to reset port allocations

### Viewer is laggy
- Reduce the view distance
- Close other viewers
- Check server resource usage

## Example Workflow

1. Create and connect a bot:
```bash
curl -X POST http://localhost:3000/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ViewerBot",
    "host": "localhost",
    "port": 25565,
    "version": "1.20.1",
    "behavior": "idle"
  }'

curl -X POST http://localhost:3000/api/bots/ViewerBot/connect
```

2. Start a viewer for the bot:
```bash
curl -X POST http://localhost:3000/api/viewers/ViewerBot/start \
  -H "Content-Type: application/json" \
  -d '{"firstPerson": false, "viewDistance": 6}'
```

3. Open the viewer in your browser:
```
http://localhost:3100
```

4. When done, stop the viewer:
```bash
curl -X POST http://localhost:3000/api/viewers/ViewerBot/stop
```

## Integration with Dashboard

You can integrate viewer controls into your dashboard by:

1. Adding a "Start Viewer" button for each bot
2. Displaying the viewer URL when active
3. Embedding the viewer in an iframe
4. Adding viewer status indicators

Example iframe embedding:
```html
<iframe
  src="http://localhost:3100"
  width="800"
  height="600"
  frameborder="0">
</iframe>
```
