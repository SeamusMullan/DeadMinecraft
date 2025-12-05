<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click="handleClose">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h2>Viewer: {{ botUsername }}</h2>
          <button @click="handleClose" class="close-btn">&times;</button>
        </div>

        <div class="modal-body">
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Starting viewer...</p>
          </div>

          <div v-else-if="error" class="error-state">
            <p class="error-message">{{ error }}</p>
            <button @click="handleRetry" class="btn btn-primary">Retry</button>
          </div>

          <div v-else-if="viewerUrl" class="viewer-container">
            <div class="viewer-info">
              <div class="info-item">
                <span class="info-label">Port:</span>
                <span class="info-value">{{ port }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">View Mode:</span>
                <span class="info-value">{{ firstPerson ? 'First Person' : 'Third Person' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">View Distance:</span>
                <span class="info-value">{{ viewDistance }} chunks</span>
              </div>
              <a :href="viewerUrl" target="_blank" class="external-link">
                Open in New Tab ↗
              </a>
            </div>

            <div class="iframe-wrapper">
              <iframe
                :src="viewerUrl"
                frameborder="0"
                allow="fullscreen"
                class="viewer-iframe"
              ></iframe>
            </div>

            <div class="viewer-controls">
              <button @click="handleReload" class="btn btn-secondary">
                Reload Viewer
              </button>
              <button @click="handleStop" class="btn btn-danger">
                Stop Viewer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useAPI } from '../composables/useAPI'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  botUsername: {
    type: String,
    required: true,
  },
  firstPerson: {
    type: Boolean,
    default: false,
  },
  viewDistance: {
    type: Number,
    default: 6,
  },
})

const emit = defineEmits(['close', 'stopped'])

const api = useAPI()

const loading = ref(false)
const error = ref(null)
const viewerUrl = ref(null)
const port = ref(null)

const handleClose = () => {
  emit('close')
}

const startViewer = async () => {
  loading.value = true
  error.value = null
  viewerUrl.value = null

  try {
    const result = await api.startViewer(props.botUsername, {
      firstPerson: props.firstPerson,
      viewDistance: props.viewDistance,
    })

    if (result.error) {
      throw new Error(result.error)
    }

    viewerUrl.value = result.url
    port.value = result.viewer.port
    console.log('Viewer started:', result)
  } catch (err) {
    error.value = err.message || 'Failed to start viewer'
    console.error('Failed to start viewer:', err)
  } finally {
    loading.value = false
  }
}

const handleStop = async () => {
  try {
    await api.stopViewer(props.botUsername)
    emit('stopped')
    handleClose()
  } catch (err) {
    console.error('Failed to stop viewer:', err)
    error.value = 'Failed to stop viewer'
  }
}

const handleRetry = () => {
  startViewer()
}

const handleReload = () => {
  if (viewerUrl.value) {
    // Force iframe reload by updating the src
    const iframe = document.querySelector('.viewer-iframe')
    if (iframe) {
      iframe.src = iframe.src
    }
  }
}

// Start viewer when modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    startViewer()
  } else {
    // Reset state when modal closes
    viewerUrl.value = null
    error.value = null
    port.value = null
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: #1a1a1a;
  border-radius: 12px;
  width: 100%;
  max-width: 1400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #333;
}

.modal-header h2 {
  color: #fff;
  font-size: 1.5rem;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #333;
  color: #fff;
}

.modal-body {
  flex: 1;
  overflow: auto;
  padding: 1.5rem;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #888;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #333;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-message {
  color: #f87171;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.viewer-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.viewer-info {
  display: flex;
  gap: 2rem;
  align-items: center;
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 8px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.info-label {
  color: #888;
  font-size: 0.875rem;
}

.info-value {
  color: #fff;
  font-weight: 600;
  font-size: 0.875rem;
}

.external-link {
  color: #3b82f6;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 600;
  margin-left: auto;
}

.external-link:hover {
  text-decoration: underline;
}

.iframe-wrapper {
  position: relative;
  width: 100%;
  height: 600px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.viewer-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.viewer-controls {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

@media (max-width: 768px) {
  .modal-container {
    max-height: 95vh;
  }

  .iframe-wrapper {
    height: 400px;
  }

  .viewer-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .external-link {
    margin-left: 0;
  }
}
</style>
