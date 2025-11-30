<template>
  <div class="control-panel">
    <h2>Control Panel</h2>

    <div class="section">
      <h3>Create Bots</h3>
      <div class="form-group">
        <label>Number of Bots:</label>
        <input v-model.number="botCount" type="number" min="1" max="500" />
      </div>

      <div class="form-group">
        <label>Prefix:</label>
        <input v-model="prefix" type="text" placeholder="Bot" />
      </div>

      <div class="form-group">
        <label>Behavior:</label>
        <select v-model="behavior">
          <option value="farmer">Farmer</option>
          <option value="miner">Miner</option>
          <option value="wanderer">Wanderer</option>
          <option value="builder">Builder</option>
          <option value="idle">Idle</option>
        </select>
      </div>

      <div class="form-group">
        <label>Auto-connect:</label>
        <input v-model="autoConnect" type="checkbox" />
      </div>

      <button @click="createBots" class="btn btn-primary" :disabled="creating">
        {{ creating ? 'Creating...' : `Create ${botCount} Bots` }}
      </button>
    </div>

    <div class="section">
      <h3>Bulk Actions</h3>
      <div class="button-group">
        <button @click="$emit('connectAll')" class="btn btn-success">
          Connect All
        </button>
        <button @click="$emit('disconnectAll')" class="btn btn-warning">
          Disconnect All
        </button>
      </div>
    </div>

    <div class="section">
      <h3>Connection Status</h3>
      <div class="connection-status">
        <div class="status-indicator" :class="{ connected: isConnected }"></div>
        <span>{{ isConnected ? 'Connected' : 'Disconnected' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  isConnected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['createBots', 'connectAll', 'disconnectAll'])

const botCount = ref(10)
const prefix = ref('Bot')
const behavior = ref('wanderer')
const autoConnect = ref(true)
const creating = ref(false)

const createBots = async () => {
  creating.value = true
  await emit('createBots', {
    count: botCount.value,
    prefix: prefix.value,
    behavior: behavior.value,
    autoConnect: autoConnect.value,
  })
  creating.value = false
}
</script>

<style scoped>
.control-panel {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 1.5rem;
}

h2 {
  margin: 0 0 1.5rem 0;
  color: #fff;
  font-size: 1.5rem;
}

h3 {
  margin: 0 0 1rem 0;
  color: #fff;
  font-size: 1.125rem;
}

.section {
  margin-bottom: 2rem;
}

.section:last-child {
  margin-bottom: 0;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #888;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
  width: 100%;
  padding: 0.5rem;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #fff;
  font-size: 1rem;
}

.form-group input[type="checkbox"] {
  width: auto;
  margin: 0;
}

.button-group {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #1a1a1a;
  border-radius: 4px;
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  transition: background 0.3s;
}

.status-indicator.connected {
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
}

.connection-status span {
  color: #fff;
  font-weight: 500;
}
</style>
