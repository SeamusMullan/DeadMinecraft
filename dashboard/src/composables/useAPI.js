const API_BASE = '/api'

export function useAPI() {
  // ==================== BOTS ====================
  const createBot = async (config) => {
    const response = await fetch(`${API_BASE}/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    return response.json()
  }

  const createMultipleBots = async (baseConfig, count, prefix = 'Bot') => {
    const response = await fetch(`${API_BASE}/bots/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseConfig, count, prefix }),
    })
    return response.json()
  }

  const connectBot = async (username) => {
    const response = await fetch(`${API_BASE}/bots/${username}/connect`, {
      method: 'POST',
    })
    return response.json()
  }

  const disconnectBot = async (username) => {
    const response = await fetch(`${API_BASE}/bots/${username}/disconnect`, {
      method: 'POST',
    })
    return response.json()
  }

  const startBot = async (username) => {
    const response = await fetch(`${API_BASE}/bots/${username}/start`, {
      method: 'POST',
    })
    return response.json()
  }

  const stopBot = async (username) => {
    const response = await fetch(`${API_BASE}/bots/${username}/stop`, {
      method: 'POST',
    })
    return response.json()
  }

  const changeBehavior = async (username, behavior) => {
    const response = await fetch(`${API_BASE}/bots/${username}/behavior`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ behavior }),
    })
    return response.json()
  }

  const deleteBot = async (username) => {
    const response = await fetch(`${API_BASE}/bots/${username}`, {
      method: 'DELETE',
    })
    return response.json()
  }

  const connectAllBots = async () => {
    const response = await fetch(`${API_BASE}/bots/all/connect`, {
      method: 'POST',
    })
    return response.json()
  }

  const disconnectAllBots = async () => {
    const response = await fetch(`${API_BASE}/bots/all/disconnect`, {
      method: 'POST',
    })
    return response.json()
  }

  const startAllBots = async () => {
    const response = await fetch(`${API_BASE}/bots/all/start`, {
      method: 'POST',
    })
    return response.json()
  }

  const stopAllBots = async () => {
    const response = await fetch(`${API_BASE}/bots/all/stop`, {
      method: 'POST',
    })
    return response.json()
  }

  const getBotStats = async (username) => {
    const response = await fetch(`${API_BASE}/bots/${username}/stats`)
    return response.json()
  }

  const getBotInventory = async (username) => {
    const response = await fetch(`${API_BASE}/bots/${username}/inventory`)
    return response.json()
  }

  const botEat = async (username, foodName) => {
    const response = await fetch(`${API_BASE}/bots/${username}/eat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ foodName }),
    })
    return response.json()
  }

  const botChat = async (username, message, target, whisper = false) => {
    const response = await fetch(`${API_BASE}/bots/${username}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, target, whisper }),
    })
    return response.json()
  }

  // ==================== GROUPS ====================
  const getGroups = async () => {
    const response = await fetch(`${API_BASE}/groups`)
    return response.json()
  }

  const getGroup = async (groupId) => {
    const response = await fetch(`${API_BASE}/groups/${groupId}`)
    return response.json()
  }

  const createGroup = async (name, bots, leader, objective) => {
    const response = await fetch(`${API_BASE}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, bots, leader, objective }),
    })
    return response.json()
  }

  const addBotToGroup = async (groupId, username) => {
    const response = await fetch(`${API_BASE}/groups/${groupId}/add/${username}`, {
      method: 'POST',
    })
    return response.json()
  }

  const removeBotFromGroup = async (groupId, username) => {
    const response = await fetch(`${API_BASE}/groups/${groupId}/remove/${username}`, {
      method: 'POST',
    })
    return response.json()
  }

  const deleteGroup = async (groupId) => {
    const response = await fetch(`${API_BASE}/groups/${groupId}`, {
      method: 'DELETE',
    })
    return response.json()
  }

  const setGroupFormation = async (groupId, formation) => {
    const response = await fetch(`${API_BASE}/groups/${groupId}/formation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formation }),
    })
    return response.json()
  }

  const setGroupObjective = async (groupId, objective) => {
    const response = await fetch(`${API_BASE}/groups/${groupId}/objective`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ objective }),
    })
    return response.json()
  }

  // ==================== ANALYTICS ====================
  const getAnalytics = async (count = 100) => {
    const response = await fetch(`${API_BASE}/analytics?count=${count}`)
    return response.json()
  }

  const getLatestAnalytics = async () => {
    const response = await fetch(`${API_BASE}/analytics/latest`)
    return response.json()
  }

  const getAggregatedStats = async () => {
    const response = await fetch(`${API_BASE}/analytics/aggregated`)
    return response.json()
  }

  const getLeaderboard = async (stat, limit = 10) => {
    const response = await fetch(`${API_BASE}/analytics/leaderboard/${stat}?limit=${limit}`)
    return response.json()
  }

  return {
    // Bots
    createBot,
    createMultipleBots,
    connectBot,
    disconnectBot,
    startBot,
    stopBot,
    changeBehavior,
    deleteBot,
    connectAllBots,
    disconnectAllBots,
    startAllBots,
    stopAllBots,
    getBotStats,
    getBotInventory,
    botEat,
    botChat,
    // Groups
    getGroups,
    getGroup,
    createGroup,
    addBotToGroup,
    removeBotFromGroup,
    deleteGroup,
    setGroupFormation,
    setGroupObjective,
    // Analytics
    getAnalytics,
    getLatestAnalytics,
    getAggregatedStats,
    getLeaderboard,
  }
}
