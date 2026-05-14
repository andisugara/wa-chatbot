<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';
import { Smartphone, LogOut, CheckCircle2, AlertCircle, Loader2 } from 'lucide-vue-next';

interface WAStatus {
  status: 'CONNECTING' | 'QR_READY' | 'CONNECTED' | 'DISCONNECTED';
  qrCode?: string | null;
}

const waStatus = ref<WAStatus>({ status: 'DISCONNECTED' });
const isLoading = ref(false);
let pollingInterval: number | null = null;

const fetchStatus = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await axios.get('/api/whatsapp/status', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    waStatus.value = res.data;

    // Adjust polling based on status
    if (res.data.status === 'CONNECTED' && pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    } else if (res.data.status !== 'CONNECTED' && !pollingInterval) {
      startPolling();
    }
  } catch (error) {
    console.error('Failed to fetch WA status:', error);
  }
};

const startPolling = () => {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = window.setInterval(fetchStatus, 3000);
};

const logoutWA = async () => {
  isLoading.value = true;
  try {
    const token = localStorage.getItem('token');
    await axios.post('/api/whatsapp/logout', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await fetchStatus();
  } catch (error) {
    console.error('Failed to logout WA:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchStatus();
  startPolling();
});

onUnmounted(() => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="header-title">
        <Smartphone :size="28" color="var(--primary)" />
        <h1>WhatsApp Connection</h1>
      </div>
      <p class="subtitle">Connect your WhatsApp account to let the agent respond to messages automatically.</p>
    </header>

    <div class="glass-panel connection-card">
      <div class="status-indicator">
        <div class="status-badge" :class="waStatus.status.toLowerCase()">
          <span class="dot"></span>
          {{ waStatus.status }}
        </div>
      </div>

      <div class="card-content">
        <!-- Connecting State -->
        <div v-if="waStatus.status === 'CONNECTING'" class="state-container animate-fade-in">
          <Loader2 class="spin-icon text-primary" :size="48" />
          <h3>Initializing Connection</h3>
          <p>Please wait while we start the WhatsApp engine...</p>
        </div>

        <!-- Disconnected State -->
        <div v-if="waStatus.status === 'DISCONNECTED'" class="state-container animate-fade-in">
          <AlertCircle class="text-danger" :size="48" />
          <h3>Disconnected</h3>
          <p>The engine is disconnected. It should try to reconnect automatically.</p>
        </div>

        <!-- QR Ready State -->
        <div v-if="waStatus.status === 'QR_READY'" class="state-container animate-fade-in">
          <h3>Scan to Connect</h3>
          <p>Open WhatsApp on your phone > Linked Devices > Link a Device, and point your camera here.</p>
          
          <div class="qr-container" v-if="waStatus.qrCode">
            <img :src="waStatus.qrCode" alt="WhatsApp QR Code" />
          </div>
          <div v-else class="qr-placeholder">
            <Loader2 class="spin-icon text-muted" :size="32" />
          </div>
        </div>

        <!-- Connected State -->
        <div v-if="waStatus.status === 'CONNECTED'" class="state-container animate-fade-in">
          <div class="success-icon-wrapper">
            <CheckCircle2 :size="64" color="var(--success)" />
          </div>
          <h3>Successfully Connected!</h3>
          <p>Your WhatsApp agent is now online and listening for incoming messages.</p>
          
          <button @click="logoutWA" class="btn-primary btn-danger mt-6" :disabled="isLoading">
            <LogOut :size="18" />
            <span>{{ isLoading ? 'Disconnecting...' : 'Disconnect Account' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 2rem;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.header-title h1 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.subtitle {
  color: var(--text-muted);
  font-size: 1.05rem;
  max-width: 600px;
}

.connection-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.status-indicator {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-glass);
  display: flex;
  justify-content: flex-end;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border-glass);
}

.status-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-badge.connected .dot { background-color: var(--success); box-shadow: 0 0 8px var(--success); }
.status-badge.qr_ready .dot { background-color: var(--primary); box-shadow: 0 0 8px var(--primary); }
.status-badge.connecting .dot { background-color: #eab308; box-shadow: 0 0 8px #eab308; }
.status-badge.disconnected .dot { background-color: var(--danger); box-shadow: 0 0 8px var(--danger); }

.card-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.state-container {
  text-align: center;
  max-width: 400px;
  width: 100%;
}

.state-container h3 {
  font-size: 1.5rem;
  margin: 1.5rem 0 0.5rem;
  color: var(--text-main);
}

.state-container p {
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 2rem;
}

.qr-container {
  background: white;
  padding: 1rem;
  border-radius: 12px;
  display: inline-block;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.qr-container img {
  display: block;
  width: 250px;
  height: 250px;
}

.qr-placeholder {
  width: 250px;
  height: 250px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

.text-primary { color: var(--primary); }
.text-danger { color: var(--danger); }
.text-muted { color: var(--text-muted); }

.success-icon-wrapper {
  display: inline-flex;
  padding: 1.5rem;
  background: rgba(16, 185, 129, 0.1);
  border-radius: 50%;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.2);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
}

.mt-6 { margin-top: 1.5rem; }

@keyframes spin {
  100% { transform: rotate(360deg); }
}
</style>
