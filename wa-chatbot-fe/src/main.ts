import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import axios from 'axios'

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL || 'http://localhost:3000'

// Attach auth token to every request and handle 401 globally
axios.interceptors.request.use((config) => {
	const token = localStorage.getItem('token');
	if (token && config && config.headers) {
		(config.headers as any).Authorization = `Bearer ${token}`;
	}
	return config;
});

axios.interceptors.response.use(
	(res) => res,
	(err) => {
		const status = err?.response?.status;
		if (status === 401) {
			// clear token and redirect to login so non-technical users aren't stuck
			localStorage.removeItem('token');
			try {
				router.push({ name: 'Login' });
			} catch (e) {
				console.warn('Router navigation failed after 401:', e);
			}
			// optionally show a simple alert (avoid external UI libs here)
			try {
				// don't block execution if alert is not desired in some envs
				window.alert('Sesi Anda telah berakhir. Silakan login kembali.');
			} catch (e) {}
		}
		return Promise.reject(err);
	}
);

const app = createApp(App)
app.use(router)
app.mount('#app')
