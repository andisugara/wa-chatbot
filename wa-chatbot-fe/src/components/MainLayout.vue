<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { Database, MessageSquare, LogOut, Bot, Smartphone, Users, Image } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const handleLogout = () => {
  localStorage.removeItem('token');
  router.push('/login');
};
</script>

<template>
  <div class="app-container">
    <!-- Sidebar -->
    <aside class="sidebar glass-panel">
      <div class="sidebar-header">
        <div class="logo">
          <Bot :size="28" color="var(--primary)" />
          <h2>Agent Portal</h2>
        </div>
      </div>

      <nav class="sidebar-nav">
        <router-link 
          to="/knowledge-base" 
          class="nav-item" 
          :class="{ active: route.name === 'KnowledgeBase' }"
        >
          <Database :size="20" />
          <span>Knowledge Base</span>
        </router-link>

        <router-link 
          to="/playground" 
          class="nav-item" 
          :class="{ active: route.name === 'Playground' }"
        >
          <MessageSquare :size="20" />
          <span>Playground</span>
        </router-link>

        <router-link 
          to="/whatsapp" 
          class="nav-item" 
          :class="{ active: route.name === 'WhatsApp' }"
        >
          <Smartphone :size="20" />
          <span>WhatsApp Connection</span>
        </router-link>

        <router-link 
          to="/contacts" 
          class="nav-item" 
          :class="{ active: route.name === 'Contacts' }"
        >
          <Users :size="20" />
          <span>Contacts</span>
        </router-link>

        <router-link 
          to="/images" 
          class="nav-item" 
          :class="{ active: route.name === 'Images' }"
        >
          <Image :size="20" />
          <span>Images</span>
        </router-link>
      </nav>


      <div class="sidebar-footer">
        <button @click="handleLogout" class="logout-btn">
          <LogOut :size="18" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <div class="content-wrapper animate-fade-in">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.sidebar {
  width: 280px;
  border-radius: 0;
  border-left: none;
  border-top: none;
  border-bottom: none;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.sidebar-header {
  padding: 2rem 1.5rem;
  border-bottom: 1px solid var(--border-glass);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.sidebar-nav {
  padding: 1.5rem 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  color: var(--text-muted);
  font-weight: 500;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

.nav-item.active {
  background: linear-gradient(90deg, rgba(99, 102, 241, 0.15), transparent);
  color: var(--primary);
  border-left: 3px solid var(--primary);
  border-radius: 0 8px 8px 0;
}

.sidebar-footer {
  padding: 1.5rem;
  border-top: 1px solid var(--border-glass);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem;
  background: transparent;
  border: 1px solid var(--border-glass);
  border-radius: 8px;
  color: var(--text-muted);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-color: rgba(239, 68, 68, 0.3);
}

.content-wrapper {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  height: 100%;
}
</style>
