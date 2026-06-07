import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import MainLayout from '../components/MainLayout.vue';
import KnowledgeView from '../views/KnowledgeView.vue';
import PlaygroundView from '../views/PlaygroundView.vue';
import WhatsAppView from '../views/WhatsAppView.vue';
import ContactsView from '../views/ContactsView.vue';
import ImagesView from '../views/ImagesView.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/knowledge-base'
      },
      {
        path: 'knowledge-base',
        name: 'KnowledgeBase',
        component: KnowledgeView
      },
      {
        path: 'playground',
        name: 'Playground',
        component: PlaygroundView
      },
      {
        path: 'whatsapp',
        name: 'WhatsApp',
        component: WhatsAppView
      },
      {
        path: 'contacts',
        name: 'Contacts',
        component: ContactsView
      },
      {
        path: 'images',
        name: 'Images',
        component: ImagesView
      }
    ]
  }
];


const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, _, next) => {
  const isAuthenticated = !!localStorage.getItem('token');

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login' });
  } else if (to.name === 'Login' && isAuthenticated) {
    next({ name: 'KnowledgeBase' });
  } else {
    next();
  }
});

export default router;
