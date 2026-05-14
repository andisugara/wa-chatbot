<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { LogIn, User, Lock } from 'lucide-vue-next';

const router = useRouter();
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const isLoading = ref(false);

const handleLogin = async () => {
  errorMsg.value = '';
  isLoading.value = true;
  try {
    const res = await axios.post('http://localhost:3000/api/auth/login', {
      email: email.value,
      password: password.value,
    });
    
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
      router.push('/knowledge-base');
    }
  } catch (error: any) {
    if (error.response?.data?.error) {
      errorMsg.value = typeof error.response.data.error === 'string' 
        ? error.response.data.error 
        : 'Invalid email or password format';
    } else {
      errorMsg.value = 'Failed to connect to the server';
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <div class="glass-panel login-card animate-fade-in">
      <div class="login-header">
        <div class="logo-circle">
          <LogIn :size="32" color="white" />
        </div>
        <h2>Welcome Back</h2>
        <p>WA Chatbot Agent Portal</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">Email Address</label>
          <div class="input-wrapper">
            <User :size="18" class="input-icon" />
            <input 
              id="email" 
              v-model="email" 
              type="email" 
              class="input-field with-icon" 
              placeholder="admin@test.com"
              required 
            />
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <div class="input-wrapper">
            <Lock :size="18" class="input-icon" />
            <input 
              id="password" 
              v-model="password" 
              type="password" 
              class="input-field with-icon" 
              placeholder="••••••••"
              required 
            />
          </div>
        </div>

        <div v-if="errorMsg" class="error-message">
          {{ errorMsg }}
        </div>

        <button type="submit" class="btn-primary login-btn" :disabled="isLoading">
          <span v-if="isLoading">Authenticating...</span>
          <span v-else>Sign In</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 2.5rem 2rem;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.logo-circle {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
}

.login-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  background: linear-gradient(to right, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-header p {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
}

.input-field.with-icon {
  padding-left: 2.5rem;
}

.login-btn {
  width: 100%;
  margin-top: 1rem;
  font-size: 1.05rem;
  padding: 0.85rem;
}

.error-message {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  text-align: center;
}
</style>
