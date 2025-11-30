<template>
  <div class="bot-card" :class="statusClass">
    <div class="bot-header">
      <div class="bot-name">{{ bot.username }}</div>
      <div class="bot-status">{{ bot.status }}</div>
    </div>

    <div class="bot-info">
      <div class="info-row">
        <span class="label">Behavior:</span>
        <span class="value">{{ bot.behavior }}</span>
      </div>

      <div v-if="bot.position" class="info-row">
        <span class="label">Position:</span>
        <span class="value">
          {{ Math.floor(bot.position.x) }},
          {{ Math.floor(bot.position.y) }},
          {{ Math.floor(bot.position.z) }}
        </span>
      </div>

      <div v-if="bot.health !== undefined" class="info-row">
        <span class="label">Health:</span>
        <span class="value">{{ bot.health }}/20</span>
      </div>

      <div v-if="bot.uptime" class="info-row">
        <span class="label">Uptime:</span>
        <span class="value">{{ formatUptime(bot.uptime) }}</span>
      </div>
    </div>

    <div class="bot-actions">
      <button
        v-if="bot.status === 'disconnected' || bot.status === 'error'"
        @click="$emit('connect', bot.username)"
        class="btn btn-primary"
      >
        Connect
      </button>

      <button
        v-if="bot.status === 'idle' || bot.status === 'running'"
        @click="$emit('disconnect', bot.username)"
        class="btn btn-secondary"
      >
        Disconnect
      </button>

      <button
        v-if="bot.status === 'idle'"
        @click="$emit('start', bot.username)"
        class="btn btn-success"
      >
        Start
      </button>

      <button
        v-if="bot.status === 'running'"
        @click="$emit('stop', bot.username)"
        class="btn btn-warning"
      >
        Stop
      </button>

      <button
        @click="$emit('delete', bot.username)"
        class="btn btn-danger"
      >
        Delete
      </button>
    </div>

    <div v-if="bot.errors && bot.errors.length > 0" class="bot-errors">
      <div class="error-label">Last Error:</div>
      <div class="error-message">{{ bot.errors[bot.errors.length - 1] }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  bot: {
    type: Object,
    required: true,
  },
})

defineEmits(['connect', 'disconnect', 'start', 'stop', 'delete'])

const statusClass = computed(() => {
  return `status-${props.bot.status}`
})

const formatUptime = (ms) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}
</script>

<style scoped>
.bot-card {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 1rem;
  border-left: 4px solid #444;
}

.status-idle {
  border-left-color: #fbbf24;
}

.status-running {
  border-left-color: #60a5fa;
}

.status-error {
  border-left-color: #f87171;
}

.status-disconnected {
  border-left-color: #6b7280;
}

.status-connecting {
  border-left-color: #a78bfa;
}

.bot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.bot-name {
  font-weight: bold;
  font-size: 1.125rem;
  color: #fff;
}

.bot-status {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  background: #444;
  color: #fff;
}

.bot-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.label {
  color: #888;
}

.value {
  color: #fff;
  font-family: monospace;
}

.bot-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-secondary {
  background: #6b7280;
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

.btn-danger {
  background: #ef4444;
  color: white;
}

.bot-errors {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 4px;
}

.error-label {
  font-size: 0.75rem;
  color: #f87171;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.error-message {
  font-size: 0.875rem;
  color: #fca5a5;
  font-family: monospace;
}
</style>
