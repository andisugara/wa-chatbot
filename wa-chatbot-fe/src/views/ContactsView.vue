<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { 
  Users, Edit2, MessageSquare, ToggleLeft, ToggleRight, 
  Search, X, Loader2, Check, AlertCircle, Calendar
} from 'lucide-vue-next';

interface Contact {
  id: string;
  phoneNumber: string;
  name: string;
  aiEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  phoneNumber: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const contacts = ref<Contact[]>([]);
const filteredContacts = ref<Contact[]>([]);
const searchQuery = ref('');
const isLoading = ref(false);
const isSaving = ref(false);

// Edit Contact Modal State
const showEditModal = ref(false);
const editingContact = ref<Contact | null>(null);
const editName = ref('');

// Chat History Drawer State
const showHistoryDrawer = ref(false);
const selectedContact = ref<Contact | null>(null);
const chatHistory = ref<ChatMessage[]>([]);
const isLoadingHistory = ref(false);

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

const fetchContacts = async () => {
  isLoading.value = true;
  try {
    const res = await axios.get('/api/contacts', getHeaders());
    contacts.value = res.data;
    applySearch();
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
  } finally {
    isLoading.value = false;
  }
};

const applySearch = () => {
  if (!searchQuery.value.trim()) {
    filteredContacts.value = contacts.value;
  } else {
    const query = searchQuery.value.toLowerCase();
    filteredContacts.value = contacts.value.filter(
      c => c.name.toLowerCase().includes(query) || c.phoneNumber.includes(query)
    );
  }
};

const handleSearch = () => {
  applySearch();
};

// Toggle AI Status
const toggleAi = async (contact: Contact) => {
  const originalStatus = contact.aiEnabled;
  // Optimistic update
  contact.aiEnabled = !contact.aiEnabled;

  try {
    await axios.put(`/api/contacts/${contact.id}`, {
      aiEnabled: contact.aiEnabled
    }, getHeaders());
  } catch (error) {
    console.error('Failed to toggle AI status:', error);
    // Revert on failure
    contact.aiEnabled = originalStatus;
  }
};

// Open Edit Modal
const openEditModal = (contact: Contact) => {
  editingContact.value = contact;
  editName.value = contact.name;
  showEditModal.value = true;
};

// Save Contact Name
const saveContactName = async () => {
  if (!editingContact.value || !editName.value.trim()) return;
  isSaving.value = true;

  try {
    const res = await axios.put(`/api/contacts/${editingContact.value.id}`, {
      name: editName.value.trim()
    }, getHeaders());

    // Update in list
    const index = contacts.value.findIndex(c => c.id === editingContact.value?.id);
    if (index !== -1) {
      contacts.value[index] = res.data;
    }
    applySearch();
    closeEditModal();
  } catch (error) {
    console.error('Failed to update contact name:', error);
  } finally {
    isSaving.value = false;
  }
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingContact.value = null;
  editName.value = '';
};

// Open Chat History
const openHistory = async (contact: Contact) => {
  selectedContact.value = contact;
  showHistoryDrawer.value = true;
  isLoadingHistory.value = true;
  chatHistory.value = [];

  try {
    const res = await axios.get(`/api/contacts/${contact.phoneNumber}/history`, getHeaders());
    chatHistory.value = res.data;
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
  } finally {
    isLoadingHistory.value = false;
  }
};

const closeHistoryDrawer = () => {
  showHistoryDrawer.value = false;
  selectedContact.value = null;
  chatHistory.value = [];
};

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

onMounted(() => {
  fetchContacts();
});
</script>

<template>
  <div class="page-container animate-fade-in">
    <header class="page-header">
      <div class="header-title">
        <Users :size="28" color="var(--primary)" />
        <h1>Contact List</h1>
      </div>
      <p class="subtitle">View WhatsApp contacts, edit their name, and toggle AI bot auto-replies vs. Human takeover.</p>
    </header>

    <!-- Search & Action bar -->
    <div class="search-bar-container glass-panel">
      <div class="search-input-wrapper">
        <Search :size="18" class="search-icon" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search by name or phone number..." 
          class="input-field search-input" 
          @input="handleSearch"
        />
      </div>
      <button @click="fetchContacts" class="btn-primary" :disabled="isLoading">
        <Loader2 v-if="isLoading" class="spin-icon" :size="16" />
        <span>Refresh</span>
      </button>
    </div>

    <!-- Contacts List Card -->
    <div class="glass-panel table-card">
      <div v-if="isLoading && contacts.length === 0" class="loading-state">
        <Loader2 class="spin-icon text-primary" :size="48" />
        <p>Loading contacts...</p>
      </div>

      <div v-else-if="filteredContacts.length === 0" class="empty-state">
        <AlertCircle :size="48" color="var(--text-muted)" />
        <h3>No contacts found</h3>
        <p v-if="searchQuery">Try adjusting your search terms.</p>
        <p v-else>Contacts will appear automatically when they message your WhatsApp number.</p>
      </div>

      <div v-else class="table-responsive">
        <table class="contacts-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone Number</th>
              <th>Created At</th>
              <th>AI Agent Status</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contact in filteredContacts" :key="contact.id" class="table-row">
              <td>
                <div class="contact-name-cell">
                  <span class="name-text">{{ contact.name }}</span>
                </div>
              </td>
              <td>
                <code class="phone-badge">{{ contact.phoneNumber }}</code>
              </td>
              <td>
                <span class="date-text">{{ formatDate(contact.createdAt) }}</span>
              </td>
              <td>
                <div class="toggle-container" @click="toggleAi(contact)">
                  <div class="switch" :class="{ 'switch-on': contact.aiEnabled }">
                    <span class="switch-handle"></span>
                  </div>
                  <span class="status-label" :class="{ 'active-text': contact.aiEnabled }">
                    {{ contact.aiEnabled ? 'AI Active' : 'Human Takeover' }}
                  </span>
                </div>
              </td>
              <td class="text-right actions-cell">
                <button @click="openEditModal(contact)" class="action-btn" title="Edit Name">
                  <Edit2 :size="16" />
                </button>
                <button @click="openHistory(contact)" class="action-btn" title="View Chat History">
                  <MessageSquare :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit Name Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal-content glass-panel animate-fade-in">
        <div class="modal-header">
          <h3>Edit Contact Name</h3>
          <button @click="closeEditModal" class="close-btn">
            <X :size="18" />
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Phone Number</label>
            <input type="text" :value="editingContact?.phoneNumber" disabled class="input-field disabled-input" />
          </div>
          <div class="form-group">
            <label>Contact Name</label>
            <input 
              v-model="editName" 
              type="text" 
              class="input-field" 
              placeholder="Enter name"
              @keyup.enter="saveContactName"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeEditModal" class="btn-primary btn-secondary" :disabled="isSaving">Cancel</button>
          <button @click="saveContactName" class="btn-primary" :disabled="isSaving || !editName.trim()">
            <Loader2 v-if="isSaving" class="spin-icon" :size="16" />
            <Check v-else :size="16" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Chat History Sliding Drawer -->
    <div v-if="showHistoryDrawer" class="drawer-overlay" @click.self="closeHistoryDrawer">
      <div class="drawer-content glass-panel">
        <div class="drawer-header">
          <div class="drawer-user-info">
            <h3>{{ selectedContact?.name }}</h3>
            <span class="phone-subtitle">{{ selectedContact?.phoneNumber }}</span>
          </div>
          <button @click="closeHistoryDrawer" class="close-btn">
            <X :size="20" />
          </button>
        </div>

        <!-- Takeover Status Bar -->
        <div class="takeover-status" :class="{ 'ai-on': selectedContact?.aiEnabled, 'ai-off': !selectedContact?.aiEnabled }">
          <div class="status-dot"></div>
          <span>
            {{ selectedContact?.aiEnabled ? 'AI Bot responds to this contact.' : 'Human Takeover Mode: AI is paused.' }}
          </span>
          <button @click="toggleAi(selectedContact!)" class="status-action-btn">
            Switch to {{ selectedContact?.aiEnabled ? 'Human' : 'AI' }}
          </button>
        </div>

        <div class="drawer-body">
          <div v-if="isLoadingHistory" class="loading-state h-full">
            <Loader2 class="spin-icon text-primary" :size="32" />
            <p>Retrieving chat history...</p>
          </div>

          <div v-else-if="chatHistory.length === 0" class="empty-chat-state">
            <MessageSquare :size="48" color="var(--text-muted)" />
            <p>No chat history recorded for this contact yet.</p>
          </div>

          <div v-else class="chat-bubbles-container">
            <div 
              v-for="msg in chatHistory" 
              :key="msg.id" 
              class="bubble-wrapper"
              :class="msg.role === 'assistant' ? 'assistant-msg' : 'user-msg'"
            >
              <div class="chat-bubble">
                <p class="bubble-content">{{ msg.content }}</p>
                <span class="bubble-time">{{ formatTime(msg.createdAt) }}</span>
              </div>
            </div>
          </div>
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
  gap: 1.5rem;
}

.page-header {
  margin-bottom: 0.5rem;
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

.search-bar-container {
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input {
  padding-left: 2.75rem;
}

.table-card {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  gap: 1rem;
  color: var(--text-muted);
}

.empty-state h3 {
  color: var(--text-main);
  font-size: 1.25rem;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  flex: 1;
}

.contacts-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.contacts-table th {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border-glass);
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.contacts-table td {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
}

.table-row {
  transition: background 0.2s ease;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.02);
}

.contact-name-cell {
  display: flex;
  flex-direction: column;
}

.name-text {
  font-weight: 600;
  color: var(--text-main);
}

.phone-badge {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.date-text {
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Toggle Switch Styles */
.toggle-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  width: fit-content;
  user-select: none;
}

.switch {
  width: 44px;
  height: 24px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid var(--border-glass);
}

.switch-handle {
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.switch-on {
  background: var(--success);
  border-color: rgba(16, 185, 129, 0.3);
}

.switch-on .switch-handle {
  left: 22px;
}

.status-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: color 0.2s;
}

.status-label.active-text {
  color: var(--success);
}

.text-right {
  text-align: right;
}

.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.action-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-glass);
  color: var(--text-muted);
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.action-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  transform: translateY(-1px);
}

/* Modals & Overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-content {
  width: 100%;
  max-width: 450px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-glass);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
  padding: 0.25rem;
}

.close-btn:hover {
  color: white;
}

.modal-body {
  padding: 1.5rem;
}

.disabled-input {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--border-glass);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-glass);
  color: var(--text-muted);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Sliding Chat History Drawer */
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 90;
  display: flex;
  justify-content: flex-end;
}

.drawer-content {
  width: 100%;
  max-width: 500px;
  height: 100%;
  border-radius: 0;
  border-right: none;
  border-top: none;
  border-bottom: none;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
  animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-glass);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-user-info h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
}

.phone-subtitle {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.takeover-status {
  padding: 0.75rem 1.25rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
}

.takeover-status.ai-on {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
  border-bottom: 1px solid rgba(16, 185, 129, 0.15);
}

.takeover-status.ai-on .status-dot {
  background: var(--success);
  box-shadow: 0 0 6px var(--success);
}

.takeover-status.ai-off {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-bottom: 1px solid rgba(239, 68, 68, 0.15);
}

.takeover-status.ai-off .status-dot {
  background: var(--danger);
  box-shadow: 0 0 6px var(--danger);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-action-btn {
  margin-left: auto;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--border-glass);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.status-action-btn:hover {
  background: white;
  color: black;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.4);
}

.empty-chat-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  gap: 1rem;
}

.chat-bubbles-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bubble-wrapper {
  display: flex;
  width: 100%;
}

.bubble-wrapper.user-msg {
  justify-content: flex-start;
}

.bubble-wrapper.assistant-msg {
  justify-content: flex-end;
}

.chat-bubble {
  max-width: 80%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.user-msg .chat-bubble {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-glass);
  border-bottom-left-radius: 2px;
  color: white;
}

.assistant-msg .chat-bubble {
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-bottom-right-radius: 2px;
  color: #e0e7ff;
}

.bubble-content {
  font-size: 0.95rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.bubble-time {
  font-size: 0.75rem;
  color: var(--text-muted);
  align-self: flex-end;
}

.h-full { height: 100%; }
</style>
