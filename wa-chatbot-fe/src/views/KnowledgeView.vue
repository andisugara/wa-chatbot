<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { DatabaseZap, CheckCircle2, Loader2, AlertCircle } from 'lucide-vue-next';

const content = ref('');
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle');
const statusMessage = ref('');

const fetchKnowledge = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await axios.get('/api/knowledge', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.data.content) {
      content.value = res.data.content;
    }
  } catch (error) {
    console.error('Failed to fetch existing knowledge:', error);
  }
};

onMounted(() => {
  fetchKnowledge();
});

const submitKnowledge = async () => {
  if (content.value.length < 10) {
    status.value = 'error';
    statusMessage.value = 'Content must be at least 10 characters long.';
    return;
  }

  status.value = 'loading';
  try {
    const token = localStorage.getItem('token');
    await axios.post('/api/knowledge', {
      content: content.value
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    status.value = 'success';
    statusMessage.value = 'Knowledge base successfully updated! The content has been embedded and stored.';
    // Removed: content.value = ''; // Retain text in textarea
    
    setTimeout(() => {
      if (status.value === 'success') status.value = 'idle';
    }, 5000);
  } catch (error: any) {
    status.value = 'error';
    statusMessage.value = error.response?.data?.error || 'Failed to update knowledge base. Please check your connection.';
  }
};
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="header-title">
        <DatabaseZap :size="28" color="var(--primary)" />
        <h1>Knowledge Base</h1>
      </div>
      <p class="subtitle">Train your agent by adding facts, FAQs, or company details. The AI will use this context to answer queries.</p>
    </header>

    <div class="glass-panel editor-card">
      <form @submit.prevent="submitKnowledge">
        <div class="form-group">
          <label for="content">Knowledge Content</label>
          <textarea 
            id="content" 
            v-model="content" 
            class="input-field textarea" 
            placeholder="e.g. Our customer support hours are from 9 AM to 5 PM EST on weekdays. We offer a 30-day money-back guarantee on all our digital products..."
            rows="8"
          ></textarea>
          <div class="char-count" :class="{ 'text-danger': content.length > 0 && content.length < 10 }">
            {{ content.length }} characters (minimum 10)
          </div>
        </div>

        <div class="action-bar">
          <button 
            type="submit" 
            class="btn-primary" 
            :disabled="status === 'loading' || content.length < 10"
          >
            <Loader2 v-if="status === 'loading'" class="spin-icon" :size="18" />
            <DatabaseZap v-else :size="18" />
            <span>{{ status === 'loading' ? 'Processing & Embedding...' : 'Update Knowledge Base' }}</span>
          </button>
        </div>
      </form>

      <!-- Status Messages -->
      <transition name="fade">
        <div v-if="status === 'success'" class="status-alert success-alert">
          <CheckCircle2 :size="20" />
          <span>{{ statusMessage }}</span>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="status === 'error'" class="status-alert error-alert">
          <AlertCircle :size="20" />
          <span>{{ statusMessage }}</span>
        </div>
      </transition>
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
  line-height: 1.5;
}

.editor-card {
  padding: 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.textarea {
  resize: vertical;
  min-height: 200px;
  font-size: 1.05rem;
  line-height: 1.6;
}

.char-count {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: right;
}

.text-danger {
  color: var(--danger);
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.status-alert {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
}

.success-alert {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: var(--success);
}

.error-alert {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: var(--danger);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
