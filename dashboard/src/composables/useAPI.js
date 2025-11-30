const API_BASE = '/api'

export function useAPI() {
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

  return {
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
  }
}
