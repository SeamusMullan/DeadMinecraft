<template>
  <div class="stats-bar">
    <div class="stat">
      <span class="stat-label">Total:</span>
      <span class="stat-value">{{ stats.total }}</span>
    </div>
    <div class="stat stat-success">
      <span class="stat-label">Connected:</span>
      <span class="stat-value">{{ stats.connected }}</span>
    </div>
    <div class="stat stat-running">
      <span class="stat-label">Running:</span>
      <span class="stat-value">{{ stats.running }}</span>
    </div>
    <div class="stat stat-idle">
      <span class="stat-label">Idle:</span>
      <span class="stat-value">{{ stats.idle }}</span>
    </div>
    <div class="stat stat-error">
      <span class="stat-label">Error:</span>
      <span class="stat-value">{{ stats.error }}</span>
    </div>
    <div class="stat stat-disconnected">
      <span class="stat-label">Disconnected:</span>
      <span class="stat-value">{{ stats.disconnected }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  stats: {
    type: Object,
    required: true,
  },
})
</script>

<style scoped>
.stats-bar {
  display: flex;
  gap: 2rem;
  padding: 1.5rem;
  background: #2a2a2a;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #888;
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #fff;
}

.stat-success .stat-value {
  color: #4ade80;
}

.stat-running .stat-value {
  color: #60a5fa;
}

.stat-idle .stat-value {
  color: #fbbf24;
}

.stat-error .stat-value {
  color: #f87171;
}

.stat-disconnected .stat-value {
  color: #6b7280;
}
</style>
