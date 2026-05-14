<script setup lang="ts">
import { ref, nextTick } from 'vue';
import axios from 'axios';
import { Send, Bot, User, MessageSquare, Loader2 } from 'lucide-vue-next';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const inputMessage = ref('');
const messages = ref<Message[]>([
  { id: Date.now(), role: 'assistant', content: 'Hello! I am your WA Chatbot Agent. Ask me anything, and I will try to answer based on the knowledge base you provided.' }
]);
const isLoading = ref(false);
const chatContainer = ref<HTMLElement | null>(null);

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return;

  const userMsg = inputMessage.value;
  messages.value.push({
    id: Date.now(),
    role: 'user',
    content: userMsg
  });
  
  inputMessage.value = '';
  isLoading.value = true;
  await scrollToBottom();

  try {
    const token = localStorage.getItem('token');
    const res = await axios.post('/api/playground', {
      message: userMsg
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    messages.value.push({
      id: Date.now(),
      role: 'assistant',
      content: res.data.reply
    });
  } catch (error: any) {
    messages.value.push({
      id: Date.now(),
      role: 'assistant',
      content: 'Sorry, I encountered an error communicating with the server. Please try again.'
    });
  } finally {
    isLoading.value = false;
    await scrollToBottom();
  }
};
</script>

<template>
  <div class="page-container">
    <header class="page-header">
      <div class="header-title">
        <MessageSquare :size="28" color="var(--primary)" />
        <h1>Playground</h1>
      </div>
      <p class="subtitle">Simulate conversations with the WA Chatbot Agent to see how it responds based on the knowledge base.</p>
    </header>

    <div class="glass-panel chat-card">
      <div class="chat-messages" ref="chatContainer">
        <div 
          v-for="msg in messages" 
          :key="msg.id" 
          class="message-wrapper animate-fade-in"
          :class="msg.role === 'user' ? 'message-user' : 'message-assistant'"
        >
          <div class="avatar">
            <User v-if="msg.role === 'user'" :size="16" />
            <Bot v-else :size="16" />
          </div>
          <div class="message-bubble">
            {{ msg.content }}
          </div>
        </div>

        <div v-if="isLoading" class="message-wrapper message-assistant animate-fade-in">
          <div class="avatar">
            <Bot :size="16" />
          </div>
          <div class="message-bubble typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <form @submit.prevent="sendMessage" class="input-form">
          <input 
            v-model="inputMessage" 
            type="text" 
            class="input-field chat-input" 
            placeholder="Type a message to test..." 
            :disabled="isLoading"
          />
          <button type="submit" class="btn-primary send-btn" :disabled="!inputMessage.trim() || isLoading">
            <Loader2 v-if="isLoading" class="spin-icon" :size="18" />
            <Send v-else :size="18" />
          </button>
        </form>
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
}

.chat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.message-wrapper {
  display: flex;
  gap: 1rem;
  max-width: 80%;
}

.message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-assistant {
  align-self: flex-start;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message-user .avatar {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  color: white;
}

.message-assistant .avatar {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-main);
  border: 1px solid var(--border-glass);
}

.message-bubble {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-wrap;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.message-user .message-bubble {
  background: var(--primary);
  color: white;
  border-top-right-radius: 4px;
}

.message-assistant .message-bubble {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--border-glass);
  color: var(--text-main);
  border-top-left-radius: 4px;
}

.chat-input-area {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-glass);
  background: rgba(15, 23, 42, 0.4);
}

.input-form {
  display: flex;
  gap: 0.75rem;
}

.chat-input {
  flex: 1;
  border-radius: 24px;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

.send-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Typing Indicator */
.typing-indicator {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 1.25rem !important;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  background-color: var(--text-muted);
  border-radius: 50%;
  display: inline-block;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>
