# Minecraft Farmer Bot

A simple Minecraft bot that automatically farms wheat using Mineflayer.

## Features

- Automatically harvests mature wheat (growth stage 7)
- Replants harvested wheat with seeds
- Collects dropped items (wheat and seeds)
- Simple chat commands (stop, start, come)
- Continuous farming loop

## Prerequisites

- [Bun](https://bun.sh) installed on your system
- A Minecraft Java Edition server (can be local)
- A Minecraft account (can use offline mode for local testing)

## Setup Instructions

### 1. Install Bun

If you don't have Bun installed:

```bash
# On macOS/Linux
curl -fsSL https://bun.sh/install | bash

# On Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Configure the Bot

Edit `farmer-bot.js` and change these settings:

```javascript
// Bot configuration (line 6-10)
const bot = mineflayer.createBot({
  host: 'localhost',     // Change to your server IP
  port: 25565,           // Change to your server port
  username: 'FarmerBot', // Change bot's name
})

// Farm location (line 13)
const FARM_CENTER = { x: 0, y: 64, z: 0 } // Change to your farm coordinates
const FARM_RADIUS = 5 // How far to search for crops
```

### 4. Prepare Your Farm

In Minecraft:

1. Create a flat area with farmland (use a hoe on dirt near water)
2. Plant some initial wheat seeds
3. Note the coordinates of your farm center (press F3 in-game)
4. Update `FARM_CENTER` in the bot code with these coordinates

### 5. Run the Bot

```bash
bun start
```

Or directly:

```bash
bun farmer-bot.js
```

## Chat Commands

While the bot is running, you can chat with it in-game:

- `stop` - Stops the farming routine
- `start` - Starts the farming routine
- `come` - Makes the bot come to you

## How It Works

The bot runs in a continuous loop:

1. **Harvest** - Scans for fully grown wheat (metadata 7) and harvests it
2. **Replant** - Finds empty farmland and plants seeds
3. **Collect** - Picks up any dropped wheat/seeds nearby
4. **Wait** - Waits 5 seconds before repeating

## Troubleshooting

### Bot won't connect

- Check your server IP and port
- Make sure the Minecraft server is running
- For online mode servers, you need a valid Minecraft account

### Bot can't find wheat

- Make sure `FARM_CENTER` coordinates are correct
- Increase `FARM_RADIUS` if your farm is large
- Ensure wheat is actually planted and mature

### Bot won't plant seeds

- Make sure the bot has seeds in its inventory
- Give the bot seeds manually or let it harvest wheat first
- Check that farmland is properly hydrated (near water)

### "Cannot read property" errors

- Make sure all dependencies are installed: `bun install`
- Check that you're using a compatible Minecraft version (1.16+)

## Offline Mode Testing

For local testing without authentication, run a local server with `online-mode=false` in server.properties.

## Advanced Usage

### Running Multiple Bots

You can run multiple instances by changing the port or creating copies with different usernames:

```bash
# Terminal 1
bun farmer-bot.js

# Terminal 2 (edit username first)
bun farmer-bot.js
```

### Custom Farm Patterns

Modify the `harvestMatureWheat()` and `replantWheat()` functions to:

- Farm different crops (carrots, potatoes, etc.)
- Use different harvesting patterns
- Add crop rotation logic

## Notes

- The bot needs seeds to replant - either give it seeds manually or let it harvest wheat first
- Wheat takes time to grow (vanilla: ~10-30 minutes)
- The bot will run indefinitely until you stop it (Ctrl+C)
- For premium Minecraft accounts, uncomment `auth: 'microsoft'` in the bot config

## License

MIT - Do whatever you want with this code!
