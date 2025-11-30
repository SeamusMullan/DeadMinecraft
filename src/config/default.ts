export const config = {
  server: {
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT || '25565'),
    maxBots: parseInt(process.env.MAX_BOTS || '500'),
    apiPort: parseInt(process.env.API_PORT || '3000'),
    wsPort: parseInt(process.env.WS_PORT || '3001'),
  },
  bot: {
    autoReconnect: process.env.AUTO_RECONNECT === 'true',
    reconnectDelay: parseInt(process.env.RECONNECT_DELAY || '5000'),
  },
}
