<template>
  <div id="app">
    <header>
      <h1>DeadMinecraft Bot Dashboard</h1>
      <p class="subtitle">Managing {{ stats.total }} bots on the server</p>
    </header>

    <main>
      <div class="layout">
        <aside class="sidebar">
          <ControlPanel
            :is-connected="isConnected"
            @create-bots="handleCreateBots"
            @connect-all="handleConnectAll"
            @start-all="handleStartAll"
            @stop-all="handleStopAll"
            @disconnect-all="handleDisconnectAll"
          />
        </aside>

        <div class="content">
          <StatsBar :stats="stats" />

          <div class="bot-grid">
            <BotCard
              v-for="bot in bots"
              :key="bot.id"
              :bot="bot"
              @connect="handleConnect"
              @disconnect="handleDisconnect"
              @start="handleStart"
              @stop="handleStop"
              @delete="handleDelete"
              @view="handleView"
            />
          </div>

          <div v-if="bots.length === 0" class="empty-state">
            <h2>No bots yet</h2>
            <p>Create some bots using the control panel to get started!</p>
          </div>
        </div>
      </div>
    </main>

    <ViewerModal
      :is-open="viewerModalOpen"
      :bot-username="selectedBotForViewer"
      :first-person="false"
      :view-distance="6"
      @close="handleCloseViewer"
      @stopped="handleViewerStopped"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useWebSocket } from './composables/useWebSocket'
import { useAPI } from './composables/useAPI'
import StatsBar from './components/StatsBar.vue'
import BotCard from './components/BotCard.vue'
import ControlPanel from './components/ControlPanel.vue'
import ViewerModal from './components/ViewerModal.vue'

const WS_URL = 'ws://localhost:3001'

const { isConnected, bots, stats } = useWebSocket(WS_URL)
const api = useAPI()

// Viewer state
const viewerModalOpen = ref(false)
const selectedBotForViewer = ref('')

const handleCreateBots = async ({ count, prefix, behavior, autoConnect }) => {
  try {
    const baseConfig = {
      host: 'localhost',
      port: 25565,
      behavior,
      autoReconnect: true,
      reconnectDelay: 5000,
    }

    const result = await api.createMultipleBots(baseConfig, count, prefix)
    console.log(`Created ${result.created} bots`)

    if (autoConnect) {
      setTimeout(() => {
        api.connectAllBots()
      }, 1000)
    }
  } catch (err) {
    console.error('Failed to create bots:', err)
  }
}

const handleConnect = async (username) => {
  try {
    await api.connectBot(username)
  } catch (err) {
    console.error('Failed to connect bot:', err)
  }
}

const handleDisconnect = async (username) => {
  try {
    await api.disconnectBot(username)
  } catch (err) {
    console.error('Failed to disconnect bot:', err)
  }
}

const handleStart = async (username) => {
  try {
    await api.startBot(username)
  } catch (err) {
    console.error('Failed to start bot:', err)
  }
}

const handleStop = async (username) => {
  try {
    await api.stopBot(username)
  } catch (err) {
    console.error('Failed to stop bot:', err)
  }
}

const handleDelete = async (username) => {
  if (confirm(`Are you sure you want to delete ${username}?`)) {
    try {
      await api.deleteBot(username)
    } catch (err) {
      console.error('Failed to delete bot:', err)
    }
  }
}

const handleConnectAll = async () => {
  try {
    await api.connectAllBots()
  } catch (err) {
    console.error('Failed to connect all bots:', err)
  }
}

const handleDisconnectAll = async () => {
  try {
    await api.disconnectAllBots()
  } catch (err) {
    console.error('Failed to disconnect all bots:', err)
  }
}

const handleStartAll = async () => {
  try {
    await api.startAllBots()
  } catch (err) {
    console.error('Failed to start all bots:', err)
  }
}

const handleStopAll = async () => {
  try {
    await api.stopAllBots()
  } catch (err) {
    console.error('Failed to stop all bots:', err)
  }
}

const handleView = (username) => {
  selectedBotForViewer.value = username
  viewerModalOpen.value = true
}

const handleCloseViewer = () => {
  viewerModalOpen.value = false
}

const handleViewerStopped = () => {
  console.log('Viewer stopped for', selectedBotForViewer.value)
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #1a1a1a;
  color: #fff;
  line-height: 1.6;
}

#app {
  min-height: 100vh;
}

header {
  background: #111;
  padding: 2rem;
  border-bottom: 2px solid #333;
}

header h1 {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #888;
  font-size: 1rem;
}

main {
  padding: 2rem;
  max-width: 1800px;
  margin: 0 auto;
}

.layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
}

.sidebar {
  position: sticky;
  top: 2rem;
  height: fit-content;
}

.bot-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #666;
}

.empty-state h2 {
  margin-bottom: 0.5rem;
}

@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
  }
}
</style>
