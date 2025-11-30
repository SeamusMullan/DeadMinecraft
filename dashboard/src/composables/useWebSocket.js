import { ref, onMounted, onUnmounted } from 'vue'

export function useWebSocket(url) {
  const isConnected = ref(false)
  const bots = ref([])
  const stats = ref({
    total: 0,
    connected: 0,
    running: 0,
    idle: 0,
    error: 0,
    disconnected: 0,
  })
  const groups = ref([])
  const analytics = ref(null)
  const chatMessages = ref([])

  let ws = null
  let reconnectTimer = null

  const connect = () => {
    ws = new WebSocket(url)

    ws.onopen = () => {
      console.log('[WebSocket] Connected')
      isConnected.value = true
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handleMessage(message)
    }

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected')
      isConnected.value = false

      // Auto-reconnect after 3 seconds
      reconnectTimer = setTimeout(connect, 3000)
    }

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error)
    }
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }
    if (ws) {
      ws.close()
      ws = null
    }
  }

  const handleMessage = (message) => {
    switch (message.type) {
      case 'init':
        bots.value = message.data.bots
        stats.value = message.data.stats
        groups.value = message.data.groups || []
        analytics.value = message.data.analytics
        break

      case 'botCreated':
        bots.value.push(message.data)
        updateStats()
        break

      case 'botConnected':
      case 'botDisconnected':
      case 'botStateUpdate':
        updateBot(message.data)
        updateStats()
        break

      case 'botRemoved':
        bots.value = bots.value.filter(b => b.username !== message.data.username)
        updateStats()
        break

      case 'botChat':
        chatMessages.value.push({
          botUsername: message.data.username,
          username: message.data.username,
          message: message.data.message,
          timestamp: Date.now(),
        })
        // Keep only last 100 messages
        if (chatMessages.value.length > 100) {
          chatMessages.value = chatMessages.value.slice(-100)
        }
        break

      case 'botDied':
        console.log(`Bot ${message.data.username} died`)
        break

      case 'groupCreated':
        groups.value.push(message.data)
        break

      case 'groupRemoved':
        groups.value = groups.value.filter(g => g.id !== message.data.groupId)
        break

      case 'botAddedToGroup':
      case 'botRemovedFromGroup':
        // Refresh groups (could be optimized with targeted update)
        break

      case 'analyticsUpdate':
        analytics.value = message.data
        break
    }
  }

  const updateBot = (updatedBot) => {
    const index = bots.value.findIndex(b => b.id === updatedBot.id)
    if (index !== -1) {
      bots.value[index] = updatedBot
    }
  }

  const updateStats = () => {
    stats.value = {
      total: bots.value.length,
      connected: bots.value.filter(b => b.status === 'idle' || b.status === 'running').length,
      running: bots.value.filter(b => b.status === 'running').length,
      idle: bots.value.filter(b => b.status === 'idle').length,
      error: bots.value.filter(b => b.status === 'error').length,
      disconnected: bots.value.filter(b => b.status === 'disconnected').length,
    }
  }

  onMounted(connect)
  onUnmounted(disconnect)

  return {
    isConnected,
    bots,
    stats,
    groups,
    analytics,
    chatMessages,
  }
}
